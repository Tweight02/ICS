import Swal, {
  type SweetAlertOptions,
  type SweetAlertResult
} from 'sweetalert2';

export function showAppAlert(
  options: SweetAlertOptions,
  autoDismiss = true
): Promise<SweetAlertResult> {
  const isDecisionDialog = Boolean(
    options.showCancelButton ||
    options.showDenyButton ||
    options.input
  );

  return Swal.fire({
    ...options,
    ...(autoDismiss && !isDecisionDialog
      ? { timer: 3000, timerProgressBar: true }
      : {})
  });
}

export function showPersistentAppAlert(
  options: SweetAlertOptions
): Promise<SweetAlertResult> {
  return showAppAlert(options, false);
}
