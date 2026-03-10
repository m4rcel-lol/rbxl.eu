/**
 * rbxl.eu — Profile page click-to-enter and interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('entry-overlay');
  const enterBtn = document.getElementById('enter-btn');
  const profileMain = document.getElementById('profile-main');

  if (!overlay || !enterBtn || !profileMain) return;

  // If no entry animation, show profile directly
  if (overlay.classList.contains('no-animation')) {
    profileMain.classList.remove('hidden');
    profileMain.classList.add('visible');
    return;
  }

  // Click to enter
  enterBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');

    setTimeout(() => {
      profileMain.classList.remove('hidden');
      profileMain.classList.add('visible');

      // Trigger enter animations if enabled
      const animations = profileMain.getAttribute('data-animations');
      if (animations === '1') {
        profileMain.classList.add('animate-enter');
      }
    }, 300);
  });

  // Keyboard accessibility
  enterBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enterBtn.click();
    }
  });
});
