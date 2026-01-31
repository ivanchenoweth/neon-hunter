window.addEventListener('load', () => {
    // Instantiate game immediately
    const game = new Game();
    window.game = game; // Expose to console for debugging
    game.init();

    // If no selection after 8s, default to keyboard
    setTimeout(() => {
        if (game.gameState === 'INITIAL' && (!window.inputMode)) {
            window.inputMode = 'keyboard';
            window.dispatchEvent(new Event('inputModeChanged'));
            game.startGame();
        }
    }, 8000);
});
