const { pool } = require('../db');
const businessModel = require('../models/businessAccountModel');

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function detectDevice(ua) {
  if (!ua) return 'Desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
  if (/Mobile|Android.*Mobi|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera M(obi|ini)/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function reconstructSessions(visits) {
  if (!visits.length) return [];
  const sorted = [...visits].sort((a, b) => {
    const cmp = (a.adresse_ip || '').localeCompare(b.adresse_ip || '');
    return cmp !== 0 ? cmp : new Date(a.date_visite) - new Date(b.date_visite);
  });
  const sessions = [];
  let cur = null;
  const WINDOW = 30 * 60 * 1000;
  for (const v of sorted) {
    const t = new Date(v.date_visite).getTime();
    if (!cur || cur.ip !== v.adresse_ip || (t - cur.lastTime) > WINDOW) {
      if (cur) sessions.push(cur);
      cur = { ip: v.adresse_ip, startTime: t, lastTime: t, pages: 1, device: detectDevice(v.user_agent), user_agent: v.user_agent, country: v.pays };
    } else {
      cur.lastTime = t;
      cur.pages++;
    }
  }
  if (cur) sessions.push(cur);
  return sessions;
}

function generateAiInsights({ summary, daily_views, heatmap, portfolios, referrers, period,
  bounce_rate, engagement_rate, avg_time_seconds, period_comparison, devices, top_interactions }) {
  const insights = [];

  // Tendance période vs période précédente
  if (period_comparison > 20) {
    insights.push(`📈 **Forte croissance** : +${period_comparison}% de vues par rapport à la période précédente. Votre présence en ligne s'améliore significativement.`);
  } else if (period_comparison > 0) {
    insights.push(`📈 **Croissance positive** : +${period_comparison}% vs la période précédente. Continuez sur cette lancée.`);
  } else if (period_comparison < -10) {
    insights.push(`📉 **Baisse de trafic** : ${period_comparison}% vs la période précédente. Partagez vos portfolios sur LinkedIn et par email pour relancer le trafic.`);
  } else {
    const half = Math.floor(daily_views.length / 2);
    const f = daily_views.slice(0, half).reduce((s, d) => s + Number(d.count), 0);
    const s2 = daily_views.slice(half).reduce((s, d) => s + Number(d.count), 0);
    if (f > 0 && s2 > f) {
      insights.push(`📈 **Tendance haussière** : +${Math.round(((s2 - f) / f) * 100)}% sur la deuxième moitié de la période.`);
    } else {
      insights.push(`📊 **Trafic stable** sur les ${period} derniers jours.`);
    }
  }

  // Taux de rebond
  if (bounce_rate > 70) {
    insights.push(`⚡ **Taux de rebond élevé** (${bounce_rate}%) : La majorité des visiteurs quittent après une seule page. Améliorez l'accroche visuelle de vos portfolios.`);
  } else if (bounce_rate > 0 && bounce_rate < 40) {
    insights.push(`✅ **Excellent engagement** : Taux de rebond de seulement ${bounce_rate}%. Vos visiteurs explorent activement vos portfolios.`);
  }

  // Temps moyen
  if (avg_time_seconds > 120) {
    const m = Math.floor(avg_time_seconds / 60), s = avg_time_seconds % 60;
    insights.push(`⏱️ **Temps de lecture excellent** : En moyenne **${m}m${s}s** par session. Vos visiteurs lisent attentivement votre contenu.`);
  } else if (avg_time_seconds > 0 && avg_time_seconds < 30) {
    insights.push(`⏱️ **Temps de lecture court** (${avg_time_seconds}s) : Enrichissez vos portfolios avec des projets visuels pour retenir l'attention.`);
  }

  // Meilleur jour/heure
  const dayTotals = Array(7).fill(0);
  heatmap.forEach(h => { dayTotals[h.day_of_week] = (dayTotals[h.day_of_week] || 0) + Number(h.count); });
  const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
  if (dayTotals[bestDay] > 0) {
    insights.push(`📅 **Meilleur jour** : Le **${DAYS_FR[bestDay]}** génère le plus de visites. Planifiez vos partages ce jour pour maximiser la visibilité.`);
  }

  const hourTotals = Array(24).fill(0);
  heatmap.forEach(h => { hourTotals[h.hour_of_day] = (hourTotals[h.hour_of_day] || 0) + Number(h.count); });
  const bestHour = hourTotals.indexOf(Math.max(...hourTotals));
  if (hourTotals[bestHour] > 0) {
    const hl = bestHour < 12 ? 'le matin' : bestHour < 18 ? "l'après-midi" : 'le soir';
    insights.push(`⏰ **Heure de pointe** : Majorité des visites à **${bestHour}h** (${hl}). Idéal pour partager vos liens.`);
  }

  // Appareils
  if (devices && devices.mobile > 60) {
    insights.push(`📱 **Audience mobile** (${devices.mobile}%) : Assurez-vous que vos portfolios sont parfaitement optimisés pour les petits écrans.`);
  } else if (devices && devices.desktop > 70) {
    insights.push(`🖥️ **Audience desktop** (${devices.desktop}%) : Profitez-en pour afficher des mises en page riches et détaillées.`);
  }

  // Portfolio star
  const top = [...portfolios].sort((a, b) => Number(b.views_total) - Number(a.views_total))[0];
  if (top && Number(top.views_total) > 0) {
    insights.push(`🏆 **Portfolio star** : « ${top.titre} » cumule **${top.views_total} vues** au total. C'est votre vitrine la plus efficace.`);
  }

  // Portfolios privés
  const privateCount = portfolios.filter(p => !p.est_public).length;
  if (privateCount > 0) {
    insights.push(`🔒 **${privateCount} portfolio${privateCount > 1 ? 's' : ''} privé${privateCount > 1 ? 's' : ''}** : Passez-les en public pour augmenter votre visibilité.`);
  }

  // Top interaction
  if (top_interactions && top_interactions.length > 0) {
    insights.push(`🖱️ **Élément star** : « ${top_interactions[0].name} » est le plus cliqué avec **${top_interactions[0].count} interactions**. Assurez-vous qu'il mène vers du contenu de qualité.`);
  }

  // Source trafic direct
  const direct = referrers.find(r => r.referer === 'Direct');
  if (direct && summary.views_period > 0) {
    const pct = Math.round((Number(direct.count) / summary.views_period) * 100);
    if (pct > 70) {
      insights.push(`🔗 **${pct}% de trafic direct** : Ajoutez votre lien sur LinkedIn, GitHub, votre signature email pour diversifier vos sources de trafic.`);
    }
  }

  if (insights.length === 0) {
    insights.push('📌 **Commencez** : Partagez vos portfolios sur LinkedIn, Instagram ou par email pour générer vos premières visites et débloquer des insights personnalisés.');
  }

  return insights.join('\n\n');
}

// ─── GET /api/business/analytics?period=30 ───────────────────────────────────
async function getAnalytics(req, res) {
  try {
    const userId = req.userId;
    const jwtRole = (req.userPayload?.role || '').toUpperCase();
    const isAdmin = jwtRole === 'BUSINESS_ADMIN';
    const period = Math.min(Math.max(Number(req.query.period) || 30, 7), 90);

    let userIds = [userId];
    let membersData = [];

    if (isAdmin) {
      const account = await businessModel.findAccountByAdminId(userId);
      if (!account) return res.status(404).json({ error: 'Compte Business introuvable' });

      const [members] = await pool.query(`
        SELECT bm.user_id, bm.invitation_email, bm.poste, bm.role AS member_role,
               u.prenom, u.nom, u.email
        FROM business_members bm
        LEFT JOIN utilisateurs u ON u.id = bm.user_id
        WHERE bm.business_account_id = ? AND bm.status = 'active'
      `, [account.id]);

      const memberUserIds = members.map(m => m.user_id).filter(Boolean);
      userIds = [...new Set([userId, ...memberUserIds])];
      membersData = members;
    }

    const ph = userIds.map(() => '?').join(',');

    // ── Portfolios ────────────────────────────────────────────────────────────
    const [portfolios] = await pool.query(`
      SELECT p.id, p.titre, p.url_slug, p.utilisateur_id, p.est_public, p.date_creation,
             COALESCE(vt.views_total, 0) AS views_total,
             COALESCE(vd.views_today, 0) AS views_today,
             COALESCE(vw.views_week, 0) AS views_week,
             COALESCE(vm.views_month, 0) AS views_month,
             COALESCE(vp.views_period, 0) AS views_period
      FROM portfolios p
      LEFT JOIN (SELECT portfolio_id, COUNT(*) AS views_total FROM visites GROUP BY portfolio_id) vt ON vt.portfolio_id = p.id
      LEFT JOIN (SELECT portfolio_id, COUNT(*) AS views_today FROM visites WHERE DATE(date_visite) = CURDATE() GROUP BY portfolio_id) vd ON vd.portfolio_id = p.id
      LEFT JOIN (SELECT portfolio_id, COUNT(*) AS views_week FROM visites WHERE date_visite >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY portfolio_id) vw ON vw.portfolio_id = p.id
      LEFT JOIN (SELECT portfolio_id, COUNT(*) AS views_month FROM visites WHERE date_visite >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY portfolio_id) vm ON vm.portfolio_id = p.id
      LEFT JOIN (SELECT portfolio_id, COUNT(*) AS views_period FROM visites WHERE date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY portfolio_id) vp ON vp.portfolio_id = p.id
      WHERE p.utilisateur_id IN (${ph})
        AND (p.deleted_at IS NULL OR p.deleted_at = '0000-00-00 00:00:00')
      ORDER BY views_total DESC
    `, [period, ...userIds]);

    const portfolioIds = portfolios.map(p => p.id);

    // ── Vues journalières ─────────────────────────────────────────────────────
    const [dailyViews] = await pool.query(`
      SELECT DATE_FORMAT(v.date_visite, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE_FORMAT(v.date_visite, '%Y-%m-%d')
      ORDER BY date ASC
    `, [...userIds, period]);

    // ── Heatmap activité (jour × heure) ───────────────────────────────────────
    const [heatmap] = await pool.query(`
      SELECT MOD(DAYOFWEEK(v.date_visite) + 5, 7) AS day_of_week,
             HOUR(v.date_visite) AS hour_of_day,
             COUNT(*) AS count
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY day_of_week, hour_of_day
    `, userIds);

    // ── Référents ─────────────────────────────────────────────────────────────
    const [referrers] = await pool.query(`
      SELECT CASE
        WHEN referer IS NULL OR referer = '' THEN 'Direct'
        WHEN referer LIKE '%linkedin%' THEN 'LinkedIn'
        WHEN referer LIKE '%facebook%' THEN 'Facebook'
        WHEN referer LIKE '%instagram%' THEN 'Instagram'
        WHEN referer LIKE '%twitter%' OR referer LIKE '%x.com%' THEN 'Twitter/X'
        WHEN referer LIKE '%google%' THEN 'Google'
        WHEN referer LIKE '%github%' THEN 'GitHub'
        ELSE SUBSTR(referer, 1, 40)
      END AS referer,
      COUNT(*) AS count
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY referer
      ORDER BY count DESC
      LIMIT 8
    `, [...userIds, period]);

    // ── Visiteurs en direct (2 min) ────────────────────────────────────────────
    const [liveRows] = await pool.query(`
      SELECT COUNT(DISTINCT v.adresse_ip) AS live
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
    `, userIds);
    const live_visitors = Number(liveRows[0]?.live) || 0;

    // ── Visiteurs uniques (période) ────────────────────────────────────────────
    const [uniqueRows] = await pool.query(`
      SELECT COUNT(DISTINCT v.adresse_ip) AS uniq
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `, [...userIds, period]);
    const unique_visitors = Number(uniqueRows[0]?.uniq) || 0;

    // ── Période précédente ────────────────────────────────────────────────────
    const [prevRows] = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND v.date_visite < DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `, [...userIds, period * 2, period]);
    const prev_period_views = Number(prevRows[0]?.cnt) || 0;

    // ── Sessions (rebond / engagement / temps) ────────────────────────────────
    const [sessionVisits] = await pool.query(`
      SELECT v.adresse_ip, v.date_visite, v.user_agent, v.pays
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY v.adresse_ip, v.date_visite ASC
    `, [...userIds, period]);

    const sessions = reconstructSessions(sessionVisits);
    const totalSessions = sessions.length;
    const bounce_rate = totalSessions > 0
      ? Math.round((sessions.filter(s => s.pages === 1).length / totalSessions) * 100) : 0;
    const durArr = sessions.filter(s => s.lastTime > s.startTime).map(s => (s.lastTime - s.startTime) / 1000);
    const avg_time_seconds = durArr.length > 0
      ? Math.round(durArr.reduce((a, b) => a + b, 0) / durArr.length) : 0;
    const engaged = sessions.filter(s => (s.lastTime - s.startTime) / 1000 > 30 || s.pages > 1).length;
    const engagement_rate = totalSessions > 0 ? Math.round((engaged / totalSessions) * 100) : 0;

    // ── Appareils ─────────────────────────────────────────────────────────────
    const dc = { Mobile: 0, Tablet: 0, Desktop: 0 };
    for (const v of sessionVisits) dc[detectDevice(v.user_agent)]++;
    const tot = sessionVisits.length || 1;
    const devices = {
      mobile: Math.round((dc.Mobile / tot) * 100),
      tablet: Math.round((dc.Tablet / tot) * 100),
      desktop: Math.round((dc.Desktop / tot) * 100),
    };

    // ── Pays ──────────────────────────────────────────────────────────────────
    const [countryRows] = await pool.query(`
      SELECT COALESCE(NULLIF(v.pays, ''), 'Inconnu') AS country, COUNT(*) AS count
      FROM visites v
      JOIN portfolios p ON p.id = v.portfolio_id
      WHERE p.utilisateur_id IN (${ph})
        AND v.date_visite >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `, [...userIds, period]);

    // ── Analytics events ──────────────────────────────────────────────────────
    let click_heatmap = [], top_interactions = [], project_views = [], total_clicks = 0;

    if (portfolioIds.length) {
      const phP = portfolioIds.map(() => '?').join(',');

      const [cRows] = await pool.query(`
        SELECT
          LEAST(FLOOR(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.x')), 0) / 10), 9) AS gx,
          LEAST(FLOOR(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.y')), 0) / 10), 9) AS gy,
          COUNT(*) AS count
        FROM analytics_events
        WHERE portfolio_id IN (${phP}) AND type = 'click'
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY gx, gy
      `, [...portfolioIds, period]);
      click_heatmap = cRows;
      total_clicks = cRows.reduce((s, r) => s + Number(r.count), 0);

      const [iRows] = await pool.query(`
        SELECT COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.name')), 'Inconnu') AS name,
               COUNT(*) AS count
        FROM analytics_events
        WHERE portfolio_id IN (${phP}) AND type = 'interaction'
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY name
        ORDER BY count DESC
        LIMIT 8
      `, [...portfolioIds, period]);
      top_interactions = iRows;

      const [pvRows] = await pool.query(`
        SELECT ae.portfolio_id,
               COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ae.payload, '$.project_id')), 'inconnu') AS project_id,
               COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ae.payload, '$.title')), '') AS title,
               COUNT(*) AS views
        FROM analytics_events ae
        WHERE ae.portfolio_id IN (${phP}) AND ae.type = 'project_view'
          AND ae.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY ae.portfolio_id, project_id, title
        ORDER BY views DESC
        LIMIT 10
      `, [...portfolioIds, period]);
      project_views = pvRows.map(r => ({
        ...r,
        portfolio_title: portfolios.find(p => p.id == r.portfolio_id)?.titre || '—',
      }));
    }

    // ── Sessions récentes ─────────────────────────────────────────────────────
    const recent_sessions = sessions
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 6)
      .map(s => ({
        ip: (s.ip || '').replace(/\.\d+$/, '.xxx'),
        device: s.device,
        country: s.country || 'Inconnu',
        pages: s.pages,
        duration_seconds: Math.round((s.lastTime - s.startTime) / 1000),
        started_at: new Date(s.startTime).toISOString(),
      }));

    // ── Stats membres (admin) ─────────────────────────────────────────────────
    let member_stats = [];
    if (isAdmin) {
      member_stats = userIds.map(uid => {
        const m = membersData.find(m => m.user_id == uid);
        const up = portfolios.filter(p => p.utilisateur_id == uid);
        return {
          user_id: uid,
          name: m ? (`${m.prenom || ''} ${m.nom || ''}`.trim() || m.email || m.invitation_email) : 'Admin',
          email: m?.email || m?.invitation_email || '',
          poste: m?.poste || (uid == userId ? 'Administrateur' : 'Collaborateur'),
          portfolio_count: up.length,
          views_total: up.reduce((s, p) => s + Number(p.views_total), 0),
          views_period: up.reduce((s, p) => s + Number(p.views_period), 0),
          is_admin: uid == userId,
        };
      }).sort((a, b) => b.views_total - a.views_total);
    }

    // ── Résumé ────────────────────────────────────────────────────────────────
    const views_period = portfolios.reduce((s, p) => s + Number(p.views_period), 0);
    const summary = {
      total_views: portfolios.reduce((s, p) => s + Number(p.views_total), 0),
      views_today: portfolios.reduce((s, p) => s + Number(p.views_today), 0),
      views_week: portfolios.reduce((s, p) => s + Number(p.views_week), 0),
      views_month: portfolios.reduce((s, p) => s + Number(p.views_month), 0),
      views_period,
      total_portfolios: portfolios.length,
      public_portfolios: portfolios.filter(p => p.est_public).length,
      total_members: isAdmin ? membersData.length : null,
    };

    // ── Score de performance ──────────────────────────────────────────────────
    const vB = Math.min(views_period / 500, 1) * 25;
    const tB = Math.min(avg_time_seconds / 300, 1) * 20;
    const bB = Math.max(0, (100 - bounce_rate) / 100) * 20;
    const eB = (engagement_rate / 100) * 15;
    const performance_score = Math.round(20 + vB + tB + bB + eB);

    // ── Comparaison de période (%) ────────────────────────────────────────────
    const period_comparison = prev_period_views > 0
      ? Math.round(((views_period - prev_period_views) / prev_period_views) * 100)
      : (views_period > 0 ? 100 : 0);

    // ── Enrichissement portfolios (admin) ─────────────────────────────────────
    const portfoliosEnriched = isAdmin ? portfolios.map(p => {
      const m = membersData.find(m => m.user_id == p.utilisateur_id);
      return {
        ...p,
        owner_name: m ? (`${m.prenom || ''} ${m.nom || ''}`.trim() || m.email) : 'Admin',
        owner_email: m?.email || m?.invitation_email || '',
      };
    }) : portfolios;

    // ── Analyse IA ────────────────────────────────────────────────────────────
    const ai_insights = generateAiInsights({
      summary, daily_views: dailyViews, heatmap, portfolios, referrers, period,
      bounce_rate, engagement_rate, avg_time_seconds, period_comparison,
      unique_visitors, devices, top_interactions,
    });

    return res.json({
      period,
      summary,
      performance_score,
      live_visitors,
      unique_visitors,
      bounce_rate,
      engagement_rate,
      avg_time_seconds,
      period_comparison,
      prev_period_views,
      devices,
      countries: countryRows,
      portfolios: portfoliosEnriched,
      member_stats,
      daily_views: dailyViews,
      heatmap,
      referrers,
      click_heatmap,
      total_clicks,
      top_interactions,
      project_views,
      recent_sessions,
      ai_insights,
    });
  } catch (err) {
    console.error('businessAnalytics.getAnalytics:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

module.exports = { getAnalytics };
