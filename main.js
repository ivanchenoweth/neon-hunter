window.addEventListener('load', () => {
    const overlay = document.getElementById('inputModeOverlay');
    const btnTouch = document.getElementById('btnTouch');
    const btnKeyboard = document.getElementById('btnKeyboard');
    const btnKeyboardFire = document.getElementById('btnKeyboardFire');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const zoomLevelSpan = document.getElementById('zoomLevel');

    window.zoomLevel = 1.0;

    const updateZoomDisplay = () => {
        zoomLevelSpan.textContent = window.zoomLevel.toFixed(1) + 'x';
    };

    btnZoomIn.addEventListener('click', () => {
        if (window.zoomLevel < 1.5) {
            window.zoomLevel += 0.1;
            updateZoomDisplay();
        }
    });

    btnZoomOut.addEventListener('click', () => {
        if (window.zoomLevel > 0.6) {
            window.zoomLevel -= 0.1;
            updateZoomDisplay();
        }
    });

    const startWithMode = (mode) => {
        window.inputMode = mode; // 'touch' or 'keyboard'
        // Notify other modules
        window.dispatchEvent(new Event('inputModeChanged'));
        if (overlay) overlay.style.display = 'none';
        // Try to enter fullscreen (must be triggered by user gesture: this click qualifies)
        const canvas = document.getElementById('gameCanvas');
        const enterFs = (elem) => {
            if (!elem) return Promise.reject('no element');
            const rfs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (rfs) return rfs.call(elem);
            return Promise.reject('requestFullscreen not supported');
        };

        enterFs(canvas || document.documentElement).catch(() => {});

        const game = new Game();
        game.init();
    };

    btnTouch.addEventListener('click', () => startWithMode('touch'));
    btnKeyboard.addEventListener('click', () => startWithMode('keyboard'));
    btnKeyboardFire.addEventListener('click', () => startWithMode('keyboardFire'));

    // If no selection after 8s, default to keyboard
    setTimeout(() => {
        if (!window.inputMode) startWithMode('keyboard');
    }, 8000);
});
