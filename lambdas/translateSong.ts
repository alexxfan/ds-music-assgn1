import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));
const translateClient = new TranslateClient({ region: process.env.REGION });

//https://completecoding.io/typescript-translation-api/
//also used some chatgpt to help get the class working

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { songId } = event.pathParameters || {};
    const language = event.queryStringParameters?.language;

    if (!songId) {
      return { statusCode: 400, body: JSON.stringify({ message: "songId is required" }) };
    }

    const songData = await ddbClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: parseInt(songId) },
    }));

    if (!songData.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "song not found" }) };
    }

    const song = songData.Item;
    
    if (!language) {
      return { statusCode: 200, body: JSON.stringify({ data: song }) };
    }

    //check if translation already exists
    const translations = song.translationCache || {};
    if (!translations[language]) {
      //translate if not found in cache
      const translationResult = await translateClient.send(
        new TranslateTextCommand({
          Text: song.title,
          SourceLanguageCode: 'en', 
          TargetLanguageCode: language,
        })
      );

      const translatedTitle = translationResult.TranslatedText || '';
      //cache translation
      const updatedTranslations = { ...translations, [language]: { title: translatedTitle } };
      await ddbClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: parseInt(songId) },
        UpdateExpression: "set translationCache = :translations",
        ExpressionAttributeValues: { ":translations": updatedTranslations },
        ReturnValues: "UPDATED_NEW"
      }));

      //update song with the translated title
      song.translationCache = updatedTranslations;
    }

    //merge the cached translation into the song data for response
    const responseSong = { ...song, title: song.translationCache[language]?.title || song.title };

    return { statusCode: 200, body: JSON.stringify({ data: responseSong }) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ message: "error translating song", error }) };
  }
};
