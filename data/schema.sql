DROP TABLE IF EXISTS saved_searches;
DROP TABLE IF EXISTS users;

CREATE TABLE saved_searches (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255),
  lat NUMERIC,
  lng NUMERIC,
  user INTEGER,
  ADD FOREIGN KEY (user) REFERENCES users(id)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255)
);

