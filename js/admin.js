// Admin panel — view all users, leaderboard, user details

export class AdminPanel {
  constructor(dataService) {
    this.dataService = dataService;
    this.users = [];
    this.selectedUser = null;
  }

  /**
   * Fetch all users and their stats
   */
  async loadUsers() {
    this.users = await this.dataService.getAllUsers();

    // Load stats for each user
    for (const user of this.users) {
      const stats = await this.dataService.getUserStats(user.uid);
      if (stats && stats.games) {
        user.totalGames = stats.games.length;
        const wins = stats.games.filter(g => g.result === 'win').length;
        const losses = stats.games.filter(g => g.result === 'loss').length;
        const draws = stats.games.filter(g => g.result === 'draw').length;
        user.record = { wins, losses, draws };

        // Calculate rating
        if (stats.games.length >= 10) {
          const recent = stats.games.slice(-30);
          const avgOpp = recent.reduce((s, g) => s + (g.opponentElo || 1200), 0) / recent.length;
          const w = recent.filter(g => g.result === 'win').length;
          const l = recent.filter(g => g.result === 'loss').length;
          user.rating = Math.max(100, Math.min(3500, Math.round(avgOpp + 400 * (w - l) / recent.length)));
        } else {
          user.rating = null;
        }

        // Last active
        if (stats.games.length > 0) {
          user.lastActive = stats.games[stats.games.length - 1].date;
        }
      } else {
        user.totalGames = 0;
        user.record = { wins: 0, losses: 0, draws: 0 };
        user.rating = null;
      }
    }

    return this.users;
  }

  /**
   * Get leaderboard sorted by rating
   */
  getLeaderboard() {
    return this.users
      .filter(u => u.rating !== null)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  /**
   * Get user detail with games
   */
  async getUserDetail(uid) {
    const user = this.users.find(u => u.uid === uid);
    if (!user) return null;

    const games = await this.dataService.getUserGames(uid, 20);
    return { ...user, recentGames: games };
  }

  /**
   * Render the admin panel HTML
   */
  renderUsersTab() {
    if (this.users.length === 0) {
      return '<p style="text-align:center;color:#888;padding:20px;">No users registered yet.</p>';
    }

    let html = '<table class="admin-users-table"><thead><tr><th>Player</th><th>Games</th><th>W/L/D</th><th>Rating</th><th>Last Active</th></tr></thead><tbody>';

    for (const user of this.users) {
      const lastDate = user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-';
      html += `<tr class="admin-user-row" data-uid="${user.uid}">
        <td>${user.displayName || user.email || 'Unknown'}</td>
        <td>${user.totalGames}</td>
        <td>${user.record.wins}/${user.record.losses}/${user.record.draws}</td>
        <td>${user.rating || '-'}</td>
        <td>${lastDate}</td>
      </tr>`;
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Render leaderboard
   */
  renderLeaderboard() {
    const leaders = this.getLeaderboard();
    if (leaders.length === 0) {
      return '<p style="text-align:center;color:#888;padding:20px;">No rated players yet (10+ games required).</p>';
    }

    let html = '<table class="admin-users-table"><thead><tr><th>#</th><th>Player</th><th>Rating</th><th>W/L/D</th></tr></thead><tbody>';

    leaders.forEach((user, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${user.displayName || user.email || 'Unknown'}</td>
        <td class="admin-rating">${user.rating}</td>
        <td>${user.record.wins}/${user.record.losses}/${user.record.draws}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Render user detail
   */
  renderUserDetail(detail) {
    let html = `<div class="admin-user-detail">
      <h3>${detail.displayName || detail.email}</h3>
      <div class="admin-detail-stats">
        <span>Games: ${detail.totalGames}</span>
        <span>Rating: ${detail.rating || 'Unrated'}</span>
        <span>W/L/D: ${detail.record.wins}/${detail.record.losses}/${detail.record.draws}</span>
      </div>`;

    if (detail.recentGames && detail.recentGames.length > 0) {
      html += '<h4>Recent Games</h4>';
      for (const g of detail.recentGames) {
        const date = new Date(g.date).toLocaleDateString();
        html += `<div class="admin-game-item">
          <span>vs ${g.opponent} (${g.opponentElo})</span>
          <span class="stats-game-result ${g.result}">${g.result}</span>
          <span>${date}</span>
        </div>`;
      }
    }

    html += '</div>';
    return html;
  }
}
