import Swal from 'sweetalert2';
import { showAppAlert } from './app-alert';

describe('showAppAlert', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-dismisses notifications after three seconds', async () => {
    const fire = vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
      dismiss: Swal.DismissReason.timer
    });

    await showAppAlert({ icon: 'success', title: 'Saved' });

    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      timer: 3000,
      timerProgressBar: true
    }));
  });

  it('does not auto-dismiss confirmation dialogs', async () => {
    const fire = vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
      dismiss: Swal.DismissReason.cancel
    });

    await showAppAlert({
      icon: 'warning',
      title: 'Confirm action',
      showCancelButton: true
    });

    expect(fire).toHaveBeenCalledWith(expect.not.objectContaining({
      timer: 3000
    }));
  });
});
