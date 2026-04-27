from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "vision-engine"
    environment: str = "development"

    marketplace_base_url: str = "http://localhost:8080"
    vision_database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    vision_internal_secret: str = ""

    openclip_model_name: str = "ViT-B-32"
    openclip_pretrained: str = "laion2b_s34b_b79k"
    embedding_dimension: int = 512

    connect_timeout_seconds: int = 5
    read_timeout_seconds: int = 20
    image_download_timeout_seconds: int = 20
    max_upload_size_bytes: int = 5_242_880
    search_candidate_multiplier: int = 8
    search_candidate_cap: int = 500
    image_search_min_confidence_score: float = 0.55
    image_search_relative_score_floor: float = 0.7
    image_search_absolute_score_floor: float = 0.4
    sync_page_size: int = 100
    sync_batch_size: int = 32


settings = Settings()
