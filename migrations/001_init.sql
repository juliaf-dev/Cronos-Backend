CREATE DATABASE IF NOT EXISTS infocimol07
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE infocimol07;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NULL,
  google_id VARCHAR(100) NULL UNIQUE,
  role ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
  foto_url VARCHAR(255) NULL,
  token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_usuarios_role(role)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS materias (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  ordem INT NOT NULL DEFAULT 0
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topicos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  materia_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
  INDEX idx_topicos_materia (materia_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subtopicos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  topico_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(180) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (topico_id) REFERENCES topicos(id) ON DELETE CASCADE,
  INDEX idx_subtopicos_topico (topico_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conteudos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  subtopico_id BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  texto_html MEDIUMTEXT NOT NULL,
  gerado_via_ia TINYINT(1) NOT NULL DEFAULT 1,
  fonte VARCHAR(255) NULL,
  versao INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subtopico_id) REFERENCES subtopicos(id) ON DELETE CASCADE,
  INDEX idx_conteudos_subtopico (subtopico_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resumos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  materia_id BIGINT UNSIGNED NOT NULL,
  conteudo_id BIGINT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  texto MEDIUMTEXT NOT NULL,
  tags JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
  FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE SET NULL,
  INDEX idx_resumos_usuario (usuario_id),
  INDEX idx_resumos_materia (materia_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcards (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  materia_id BIGINT UNSIGNED NOT NULL,
  frente TEXT NOT NULL,
  verso TEXT NOT NULL,
  origem_tipo ENUM('manual','quiz','conteudo') NOT NULL DEFAULT 'manual',
  origem_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
  INDEX idx_flashcards_usuario (usuario_id),
  INDEX idx_flashcards_materia (materia_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questoes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  materia_id BIGINT UNSIGNED NOT NULL,
  topico_id BIGINT UNSIGNED NULL,
  subtopico_id BIGINT UNSIGNED NULL,
  enunciado MEDIUMTEXT NOT NULL,
  dificuldade ENUM('facil','medio','dificil') NOT NULL DEFAULT 'medio',
  origem ENUM('humana','ia') NOT NULL DEFAULT 'ia',
  explicacao MEDIUMTEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
  FOREIGN KEY (topico_id) REFERENCES topicos(id) ON DELETE SET NULL,
  FOREIGN KEY (subtopico_id) REFERENCES subtopicos(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_questoes_materia (materia_id, dificuldade)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS respostas (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  questao_id BIGINT UNSIGNED NOT NULL,
  alternativa VARCHAR(1) NOT NULL,
  texto TEXT NOT NULL,
  correta TINYINT(1) NOT NULL DEFAULT 0,
  explicacao TEXT NULL,
  FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_respostas (questao_id, alternativa),
  INDEX idx_respostas_questao (questao_id)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  materia_id BIGINT UNSIGNED NULL,
  topico_id BIGINT UNSIGNED NULL,
  subtopico_id BIGINT UNSIGNED NULL,
  total INT NOT NULL,
  acertos INT NOT NULL DEFAULT 0,
  tempo_seg INT NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE SET NULL,
  FOREIGN KEY (topico_id) REFERENCES topicos(id) ON DELETE SET NULL,
  FOREIGN KEY (subtopico_id) REFERENCES subtopicos(id) ON DELETE SET NULL,
  INDEX idx_quiz_usuario (usuario_id, started_at)
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS motivacoes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  texto VARCHAR(240) NOT NULL,
  autor VARCHAR(120) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  peso INT NOT NULL DEFAULT 1
) DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
