import AdminConfirmDialog from '../../../Admin/AdminConfirmDialog';
import type { DeleteConfirmState } from '../../vendorProducts.types';

interface VendorProductsDeleteDialogProps {
  state: DeleteConfirmState | null;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

const VendorProductsDeleteDialog = ({
  state,
  onCancel,
  onConfirm,
}: VendorProductsDeleteDialogProps) => (
  <AdminConfirmDialog
    open={Boolean(state)}
    title={state?.title || 'Xác nhận xóa'}
    description={state?.description || ''}
    selectedItems={state?.selectedItems}
    selectedNoun="sản phẩm"
    confirmLabel={state?.confirmLabel || 'Xóa'}
    danger
    variant="vendor"
    onCancel={onCancel}
    onConfirm={() => void onConfirm()}
  />
);

export default VendorProductsDeleteDialog;
