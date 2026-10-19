const state = {
  selectedSquare: null,
  validMoves: [],
  gameMode: 'ai-medium',
  isAIThinking: false,
  isAnimating: false,
  pendingAiTimeout: null,
  isFlipped: false,
};

window.__cancelPendingAiTurn = function cancelPendingAiTurn() {
  if (state.pendingAiTimeout !== null) {
    clearTimeout(state.pendingAiTimeout);
    state.pendingAiTimeout = null;
  }
};

window.__chessGameState = state;
