import Swal, {
  type SweetAlertOptions,
  type SweetAlertResult
} from 'sweetalert2';

export function showAppAlert(
  options: SweetAlertOptions
): Promise<SweetAlertResult> {
  const isDecisionDialog = Boolean(
    options.showCancelButton ||
    options.showDenyButton ||
    options.input
  );

  return Swal.fire({
    ...options,
    ...(!isDecisionDialog
      ? { timer: 3000, timerProgressBar: true }
      : {})
  });
}
