window.__createUiController = function createUiController({ game, gameState, elements }) {
  const { turnDot, turnText, aiThinkingEl, historyList, capturedWhiteEl, capturedBlackEl } = elements;

  return {
    updateTurnIndicator() {
      const turn = game.turn();
      if (turn === 'w') {
        turnDot.className = 'w-3.5 h-3.5 rounded-full bg-slate-100 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse';
        turnText.textContent = "White's Turn (Marble)";
      } else {
        turnDot.className = 'w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse';
        turnText.textContent = "Black's Turn (Obsidian)";
      }

      if (gameState.isAIThinking) {
        aiThinkingEl.classList.remove('hidden');
      } else {
        aiThinkingEl.classList.add('hidden');
      }
    },

    updateCapturedList() {
      const history = game.history({ verbose: true });
      const whiteLost = [];
      const blackLost = [];
      const pieceSymbols = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

      history.forEach((move) => {
        if (!move.captured) return;
        if (move.color === 'w') {
          blackLost.push(pieceSymbols[move.captured] || move.captured.toUpperCase());
        } else {
          whiteLost.push(pieceSymbols[move.captured] || move.captured.toUpperCase());
        }
      });

      capturedWhiteEl.textContent = whiteLost.length ? whiteLost.join(' ') : 'None';
      capturedBlackEl.textContent = blackLost.length ? blackLost.join(' ') : 'None';
    },

    updateMoveHistoryList() {
      const history = game.history({ verbose: true });
      if (history.length === 0) {
        historyList.innerHTML = '<div class="text-slate-500 italic text-center py-4">No moves played yet</div>';
        return;
      }

      let html = '';
      for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i] ? history[i].san : '';
        const blackMove = history[i + 1] ? history[i + 1].san : '';

        html += `
          <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/40 transition-colors">
            <span class="text-slate-500 w-8">${moveNumber}.</span>
            <span class="text-slate-200 font-medium w-16">${whiteMove}</span>
            <span class="text-purple-300 font-medium w-16 text-right">${blackMove}</span>
          </div>
        `;
      }

      historyList.innerHTML = html;
      historyList.scrollTop = historyList.scrollHeight;
    }
  };
};
