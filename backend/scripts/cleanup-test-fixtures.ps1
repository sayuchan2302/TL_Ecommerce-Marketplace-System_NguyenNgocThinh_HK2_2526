param(
    [switch]$Apply,
    [string]$SqlFile = (Join-Path $PSScriptRoot 'cleanup-test-fixtures.sql')
)

$ErrorActionPreference = 'Stop'

function Read-DotEnv {
    param([string]$Path)
    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }
        if ($line -match '^([^=]+)=(.*)$') {
            $values[$matches[1].Trim()] = $matches[2].Trim().Trim('"')
        }
    }
    return $values
}

function Merge-Config {
    param([hashtable]$Base, [hashtable]$Override)
    foreach ($key in $Override.Keys) {
        $Base[$key] = $Override[$key]
    }
    return $Base
}

function Resolve-Psql {
    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    $candidates = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe',
        'C:\Program Files\PostgreSQL\15\bin\psql.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    throw 'psql.exe not found. Install PostgreSQL client tools or add psql to PATH.'
}

function Get-Connection {
    param([hashtable]$Config)
    $url = $Config['DB_URL']
    if (-not $url) {
        $url = 'jdbc:postgresql://localhost:5432/marketplace_db'
    }
    if ($url -notmatch '^jdbc:postgresql://([^:/?]+)(?::([0-9]+))?/([^?]+)') {
        throw "Cannot parse DB_URL: $url"
    }
    return @{
        Host = $matches[1]
        Port = if ($matches[2]) { $matches[2] } else { '5432' }
        Database = $matches[3]
        User = if ($Config['DB_USERNAME']) { $Config['DB_USERNAME'] } else { 'postgres' }
        Password = $Config['DB_PASSWORD']
    }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backendRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$config = @{}
$config = Merge-Config $config (Read-DotEnv (Join-Path $projectRoot '.env'))
$config = Merge-Config $config (Read-DotEnv (Join-Path $backendRoot '.env'))
$connection = Get-Connection $config
$psql = Resolve-Psql

$dryRunSql = @'
WITH fixture_products AS (
  SELECT id FROM products
  WHERE name LIKE 'Review Fixture %'
     OR name LIKE 'Lookup Product %'
     OR name LIKE 'IT Product %'
     OR name LIKE 'Unpurchased %'
     OR name LIKE 'Return Fixture %'
), fixture_orders AS (
  SELECT id FROM orders
  WHERE order_code LIKE 'ORD-RV-%'
     OR order_code LIKE 'ORD-LOOKUP-%'
     OR order_code LIKE 'ORD-IT-%'
     OR order_code LIKE 'ORD-RT-%'
     OR order_code LIKE 'ORD-ST-%'
     OR order_code LIKE 'ORD-MIGR-%'
), fixture_returns AS (
  SELECT id FROM return_requests
  WHERE return_code LIKE 'RT-LOOKUP-%'
     OR return_code LIKE 'RT-IT-%'
), fixture_vouchers AS (
  SELECT id FROM vouchers
  WHERE code ~ '^(MKT|FOL|RMD)[0-9]{10,}$'
     OR name IN ('Marketplace Campaign Integration', 'Follower Promo Integration', 'Reminder Campaign Integration')
), fixture_events AS (
  SELECT id FROM promotion_notification_events
  WHERE voucher_code ~ '^(MKT|FOL|RMD)[0-9]{10,}$'
)
SELECT 'products' AS kind, count(*) AS rows FROM fixture_products
UNION ALL SELECT 'orders', count(*) FROM fixture_orders
UNION ALL SELECT 'returns', count(*) FROM fixture_returns
UNION ALL SELECT 'vouchers', count(*) FROM fixture_vouchers
UNION ALL SELECT 'promotion_events', count(*) FROM fixture_events
UNION ALL SELECT 'test_users', count(*) FROM users WHERE email LIKE 'migration-test-%@local'
UNION ALL SELECT 'test_coupons', count(*) FROM coupons WHERE code LIKE 'CPN-IT-%' OR code LIKE 'MIGRC%'
UNION ALL SELECT 'test_bot_revisions', count(*) FROM bot_scenario_revisions WHERE payload_json LIKE '%Ban hay chon chuc nang de tiep tuc.%';
'@

$previousPassword = $env:PGPASSWORD
$env:PGPASSWORD = $connection.Password
try {
    if ($Apply) {
        & $psql -h $connection.Host -p $connection.Port -U $connection.User -d $connection.Database -v ON_ERROR_STOP=1 -f $SqlFile
    } else {
        & $psql -h $connection.Host -p $connection.Port -U $connection.User -d $connection.Database -v ON_ERROR_STOP=1 -c $dryRunSql
        Write-Host 'Dry run only. Re-run with -Apply to delete these test fixtures.'
    }
} finally {
    if ($null -eq $previousPassword) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $previousPassword
    }
}
