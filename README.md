## Serverless REST Assignment - Distributed Systems.

__Name:__ Alex Fan

__Demo:__ The demo link will be attached to the txt file uploaded to Moodle.

### Context.

This assignment is a serverless REST API built for a music application, where users can store and get song details. The main database table (`Songs`) stores song information, including attributes like `songId`, `title`, `artistName` and `album`.

### App API endpoints.

- POST /songs - Add a new song to the database.
- GET /songs/{songId} - Get all songs with a specific `songId`.
- GET /songs - Gets all songs in the database.
- GET /songs/artist?{songId}=attributeX=value - Get song by specific artist also querying attribute.
- GET /songs/{songId}/translation?language={language} - Get a song and translate the title.
- PUT /songs/{songId} - Update an existing song entry.
- DELETE /songs/{songId} - Delete a song from the database.

### Update.

I added an option to update as long as you have the correct table format in place and you need a cookie from an authorized account which is signed in.

### Translation persistence.

For translation, each time a song is translated it is added to an array of strings called translation cache. Before translating a song, the endpoint will check the cache to see if the song has already been translated in the chosen language and if it is, it will just return the translated string rather than translating it again.

###  Extra.

I have a multi-stack solution by having one stack deal with the REST Api endpoints and the other stack deal with authentication.