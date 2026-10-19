window.__createGameController = function createGameController({
  game,
  gameState,
  getSquareCoords,
  clearHighlights,
  getHighlightMesh,
  selectHighlightMat,
  moveHighlightMat,
  attackHighlightMat,
  syncBoardPieces,
  updateTurnIndicator,
  updateCapturedList,
  updateMoveHistoryList,
  checkGameOver,
  animateMove,
  aiController,
  cancelPendingAiTurn,
}) {
  const controller = {
    showTileHighlights(fromSquare) {
      clearHighlights();
      gameState.validMoves = game.moves({ square: fromSquare, verbose: true });

      const originCoords = getSquareCoords(fromSquare);
      const selMesh = getHighlightMesh();
      selMesh.position.set(originCoords.x, 0.12, originCoords.z);
      selMesh.material = selectHighlightMat;

      gameState.validMoves.forEach((move) => {
        const targetCoords = getSquareCoords(move.to);
        const mesh = getHighlightMesh();
        mesh.position.set(targetCoords.x, 0.12, targetCoords.z);
        mesh.material = move.captured ? attackHighlightMat : moveHighlightMat;
      });
    },

    executeMove(moveObj) {
      if (gameState.isAnimating || game.game_over()) return;

      const isCapture = Boolean(moveObj.captured);
      const fromSq = moveObj.from;
      const toSq = moveObj.to;
      gameState.isAnimating = true;

      animateMove(fromSq, toSq, isCapture, () => {
        game.move(moveObj);
        syncBoardPieces();
        clearHighlights();
        gameState.selectedSquare = null;
        updateTurnIndicator();
        updateCapturedList();
        updateMoveHistoryList();
        checkGameOver();
        gameState.isAnimating = false;

        if (!game.game_over() && gameState.gameMode.startsWith('ai') && game.turn() === 'b') {
          gameState.isAIThinking = true;
          updateTurnIndicator();
          cancelPendingAiTurn();
          gameState.pendingAiTimeout = setTimeout(() => {
            gameState.pendingAiTimeout = null;
            const aiMove = aiController.chooseAiMove();
            gameState.isAIThinking = false;
            updateTurnIndicator();
            if (aiMove) {
              controller.executeMove(aiMove);
            }
          }, 400);
        }
      });
    },

    handleSelection(clickedSquare) {
      const currentTurn = game.turn();
      const pieceOnSquare = game.get(clickedSquare);

      if (gameState.selectedSquare) {
        const candidateMove = gameState.validMoves.find((move) => move.to === clickedSquare);
        if (candidateMove) {
          controller.executeMove(candidateMove);
          return;
        }
      }

      if (pieceOnSquare && pieceOnSquare.color === currentTurn) {
        if (gameState.gameMode.startsWith('ai') && currentTurn === 'b') return;
        gameState.selectedSquare = clickedSquare;
        controller.showTileHighlights(clickedSquare);
        if (globalThis.audio && globalThis.audio.playHover) {
          globalThis.audio.playHover();
        }
      } else {
        gameState.selectedSquare = null;
        clearHighlights();
      }
    },

    reset() {
      cancelPendingAiTurn();
      gameState.isAIThinking = false;
      gameState.isAnimating = false;
      game.reset();
      gameState.selectedSquare = null;
      gameState.validMoves = [];
      clearHighlights();
      syncBoardPieces();
      updateTurnIndicator();
      updateCapturedList();
      updateMoveHistoryList();
      const modal = document.getElementById('modal-gameover');
      if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
      }
    },

    undo() {
      if (gameState.isAIThinking || gameState.isAnimating) return;
      cancelPendingAiTurn();
      gameState.isAIThinking = false;

      const undoCount = gameState.gameMode.startsWith('ai') ? 2 : 1;
      for (let i = 0; i < undoCount && game.history().length > 0; i++) {
        game.undo();
      }

      gameState.selectedSquare = null;
      gameState.validMoves = [];
      clearHighlights();
      syncBoardPieces();
      updateTurnIndicator();
      updateCapturedList();
      updateMoveHistoryList();
      const modal = document.getElementById('modal-gameover');
      if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
      }
    }
  };

  return controller;
};
