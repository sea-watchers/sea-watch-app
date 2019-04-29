DROP TABLE IF EXISTS saved_searches;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255)
);

CREATE TABLE saved_searches (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255),
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  person INTEGER,
  FOREIGN KEY (person) REFERENCES users(id)
);


