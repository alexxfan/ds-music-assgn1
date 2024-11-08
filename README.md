## Serverless REST Assignment - Distributed Systems.

__Name:__ Alex Fan

__Demo:__ ... link to your YouTube video demonstration ......

### Context.

This assignment is a serverless REST API built for a music application, where users can store and get song details. The main database table (`Songs`) stores song information, including attributes like `songId`, `title`, `artistName` and `album`.

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.
 
- POST /songs - Add a new song to the database.
- GET /songs/{songId} - Get all songs with a specific `songId`.
- GET /songs - Gets all songs in the database.
- GET /songs/artist?{songId}=attributeX=value - Get song by specific artist also querying attribute
- PUT /songs/{songId} - Update an existing song entry .
- DELETE /songs/{songId} - Delete a song from the database.

### Update constraint (if relevant).

[Briefly explain your design for the solution to the PUT/Update constraint 
- only the user who added an item to the main table could update it.]

### Translation persistence (if relevant).

[Briefly explain your design for the solution to avoid repeat requests to Amazon Translate - persist translations so that Amazon Translate can be bypassed for repeat translation requests.]

###  Extra (If relevant).

[ State whether you have created a multi-stack solution for this assignment or used lambda layers to speed up update deployments. Also, mention any aspect of the CDK framework __that was not covered in the lectures that you used in this assignment. ]