/**
 * Utility function to upscale Twitter profile images for better quality
 */
const upscaleTwitterImage = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  
  // Replace _normal.jpg with _400x400.jpg for better quality
  return imageUrl.replace(/_normal\.jpg$/, '_400x400.jpg');
};

/**
 * Gets the user's display icon with upscaling and fallback
 * @param displayIcon - The user's display icon URL (usually from Twitter)
 * @param fallback - The fallback image path (defaults to default.jpeg)
 * @returns The processed image URL with fallback
 */
export const getUserDisplayIcon = (
  displayIcon: string | null | undefined,
  fallback: string = "/assets/images/default.jpeg"
): string => {
  return upscaleTwitterImage(displayIcon) ?? fallback;
};

/**
 * Gets the user's display icon for profile pages (with different fallback)
 * @param profileImageUrl - The user's profile image URL
 * @param fallback - The fallback image path (defaults to default-avatar.png)
 * @returns The processed image URL with fallback
 */
export const getProfileDisplayIcon = (
  profileImageUrl: string | null | undefined,
  fallback: string = "/default-avatar.png"
): string => {
  return upscaleTwitterImage(profileImageUrl) ?? fallback;
};
