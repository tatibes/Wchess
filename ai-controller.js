window.__createAiController = function createAiController({ game, gameState, minimax }) {
  return {
    chooseAiMove() {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return null;

      if (gameState.gameMode === 'ai-easy') {
        return moves[Math.floor(Math.random() * moves.length)];
      }

      const searchDepth = gameState.gameMode === 'ai-hard' ? 3 : 2;
      let bestMove = null;
      let bestValue = Infinity;

      moves.sort(() => Math.random() - 0.5);

      for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, searchDepth - 1, -Infinity, Infinity, true);
        game.undo();

        if (boardValue < bestValue) {
          bestValue = boardValue;
          bestMove = move;
        }
      }

      return bestMove || moves[0];
    }
  };
};
