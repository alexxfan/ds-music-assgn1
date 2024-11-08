export type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre_ids: number[];
  release_date: string;
  language: string;
  duration: number;
  explicit: boolean;
};

export type SongArtist = {
  songId: number;
  artistName: string;
  stageName: string;
};
// Used to validate the query string of HTTP Get requests
export type SongArtistQueryParams = {
  songId: string;
  artistName?: string;
  stageName?: string
}

export type SignUpBody = {
  username: string;
  password: string;
  email: string
}

export type ConfirmSignUpBody = {
  username: string;
  code: string;
}

export type SignInBody = {
  username: string;
  password: string;
}
