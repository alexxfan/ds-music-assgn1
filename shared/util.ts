import { marshall } from "@aws-sdk/util-dynamodb";
import { Song, SongArtist } from "./types";

type Entity = Song | SongArtist; 

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};
