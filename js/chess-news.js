// Chess news and live broadcasts from Lichess API

export class ChessNews {
  constructor() {
    this.broadcasts = [];
    this.loading = false;
    this.lastFetch = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch live and upcoming broadcasts from Lichess
   */
  async fetchBroadcasts() {
    // Use cache if recent
    if (Date.now() - this.lastFetch < this.cacheDuration && this.broadcasts.length > 0) {
      return this.broadcasts;
    }

    this.loading = true;
    try {
      const res = await fetch('https://lichess.org/api/broadcast?nb=20', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      // Lichess returns an array of broadcast tournaments
      this.broadcasts = (data || []).map(b => ({
        id: b.tour?.id || b.id,
        name: b.tour?.name || b.name || 'Unknown Event',
        description: b.tour?.description || b.description || '',
        slug: b.tour?.slug || b.slug || '',
        url: b.tour?.url ? `https://lichess.org${b.tour.url}` : `https://lichess.org/broadcast/${b.tour?.slug || b.slug || ''}/${b.tour?.id || b.id}`,
        status: this._getStatus(b),
        startsAt: b.round?.startsAt || b.tour?.dates?.[0] || null,
        tier: b.tour?.tier || 0,
        round: b.round?.name || '',
        ongoing: b.round?.ongoing || false,
        finished: b.round?.finished || false
      }));

      this.lastFetch = Date.now();
    } catch (err) {
      console.warn('Failed to fetch chess broadcasts:', err);
    }
    this.loading = false;
    return this.broadcasts;
  }

  _getStatus(b) {
    if (b.round?.ongoing) return 'live';
    if (b.round?.finished) return 'finished';
    return 'upcoming';
  }

  /**
   * Get curated chess news items (static + dynamic)
   */
  getNewsItems() {
    return [
      {
        type: 'link',
        title: 'FIDE Official',
        description: 'World Chess Federation — rankings, regulations, calendar',
        url: 'https://www.fide.com',
        icon: 'fide'
      },
      {
        type: 'link',
        title: 'Chess24',
        description: 'Live coverage, broadcasts, and top GM commentary',
        url: 'https://chess24.com',
        icon: 'news'
      },
      {
        type: 'link',
        title: 'ChessBase News',
        description: 'Latest chess news, reports, and interviews',
        url: 'https://en.chessbase.com',
        icon: 'news'
      },
      {
        type: 'link',
        title: 'Lichess Broadcasts',
        description: 'Follow top tournaments with free live relay',
        url: 'https://lichess.org/broadcast',
        icon: 'live'
      },
      {
        type: 'link',
        title: '2700chess.com',
        description: 'Live top player ratings and statistics',
        url: 'https://2700chess.com',
        icon: 'rating'
      },
      {
        type: 'link',
        title: 'The Week in Chess',
        description: 'Weekly chess news and game archives since 1994',
        url: 'https://theweekinchess.com',
        icon: 'news'
      }
    ];
  }

  /**
   * Format a date for display
   */
  formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diff = d - now;

    if (diff < 0 && diff > -86400000) {
      return 'Today';
    }
    if (diff > 0 && diff < 86400000) {
      const hours = Math.ceil(diff / 3600000);
      return `In ${hours}h`;
    }
    if (diff > 86400000 && diff < 7 * 86400000) {
      const days = Math.ceil(diff / 86400000);
      return `In ${days}d`;
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
