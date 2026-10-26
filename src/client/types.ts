export interface Creator {
  id: string;
  handle: string;
  media_count: number;
}

export interface MediaAsset {
  id: string;
  creator_id: string;
  creator_handle: string;
  media_type: 'image' | 'video';
  r2_key: string;
  poster_key: string | null;
  published_at: string;
  width: number | null;
  height: number | null;
  is_bookmarked: boolean;
}
