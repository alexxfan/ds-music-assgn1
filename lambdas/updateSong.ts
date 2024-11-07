import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Song"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    // Print Event
    console.log("[EVENT]", JSON.stringify(event));
    
    const songId = event.pathParameters?.songId;

    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!songId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing song ID in path parameters" }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Incorrect type. Must match Song schema`,
          schema: schema.definitions["Song"],
        }),
      };
    }

   // Used ChatGPT for this 
   const commandOutput = await ddbDocClient.send(
    new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: Number(songId) },
      UpdateExpression: "SET title = :title, artist = :artist, album = :album, genre_ids = :genre_ids, release_date = :release_date, #lang = :language, #dur = :duration, explicit = :explicit",
      ExpressionAttributeValues: {
        ":title": body.title,
        ":artist": body.artist,
        ":album": body.album,
        ":genre_ids": body.genre_ids,
        ":release_date": body.release_date,
        ":language": body.language,  
        ":duration": body.duration,   
        ":explicit": body.explicit,
      },
      ExpressionAttributeNames: {
        "#lang": "language",  //alias for the reserved keyword "language" due to error "Invalid UpdateExpression: Attribute name is a reserved keyword; reserved keyword: language"
        "#dur": "duration"    //alias for the reserved keyword "duration" due to error "Invalid UpdateExpression: Attribute name is a reserved keyword; reserved keyword: duration"
      },
      ReturnValues: "ALL_NEW",
    })
  );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: `Song with ID ${songId} updated successfully`, updatedAttributes: commandOutput.Attributes }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
