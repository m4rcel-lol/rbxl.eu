/**
 * rbxl.eu — Client-side application script
 * Material You ripple effects and interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Ripple effect on buttons
  document.querySelectorAll('.m3-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        left:${x}px; top:${y}px; border-radius:50%;
        background:currentColor; opacity:0.12;
        transform:scale(0); animation:ripple 0.6s ease-out;
        pointer-events:none;
      `;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Add ripple keyframes
  if (!document.querySelector('#ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = '@keyframes ripple{to{transform:scale(4);opacity:0}}';
    document.head.appendChild(style);
  }
});
