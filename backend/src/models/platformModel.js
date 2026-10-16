// Notifications de la plateforme via n8n : événements admin (inscriptions, paiements…),
// relances des comptes expirés, désinscription des relances.
const { pool } = require('../db');

async function init() {
  // Outbox : événements à transmettre au workflow n8n « Notifications admin »
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_events (
      id            CHAR(36)     NOT NULL,
      event         VARCHAR(60)  NOT NULL,
      payload       LONGTEXT     NOT NULL,
      attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
      delivered_at  DATETIME     NULL,
      last_error    VARCHAR(500) NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_platform_events_pending (delivered_at, attempts),
      KEY idx_platform_events_event (event, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Repères de la surveillance (dernier id vu par table, date de mise en service…)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_watch_state (
      cle         VARCHAR(60)  NOT NULL PRIMARY KEY,
      valeur      VARCHAR(60)  NOT NULL,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Déjà notifié (ex. paiement « réussi ») : une seule alerte par élément et par type
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_notified (
      entity      VARCHAR(30) NOT NULL,
      entity_id   INT         NOT NULL,
      kind        VARCHAR(30) NOT NULL,
      created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity, entity_id, kind)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Relances des comptes expirés : une ligne par relance (J+3, J+10, J+30, J+60) et par expiration
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_relances (
      id             INT NOT NULL AUTO_INCREMENT,
      utilisateur_id INT NOT NULL,
      abonnement_id  INT NOT NULL,
      step           VARCHAR(10) NOT NULL,
      email_to       VARCHAR(190) NOT NULL,
      status         ENUM('claimed','sent','failed') NOT NULL DEFAULT 'claimed',
      error          VARCHAR(500) NULL,
      created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_relance (utilisateur_id, abonnement_id, step),
      KEY idx_relance_user (utilisateur_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Utilisateurs qui ne veulent plus recevoir les relances
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_optouts (
      utilisateur_id INT NOT NULL PRIMARY KEY,
      created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { init };
