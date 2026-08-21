import { isFullFilm, isPublicTrailer } from './streaming-access.util';

describe('streaming-access.util', () => {
  it('identifies public trailers', () => {
    expect(isPublicTrailer({ type: 'trailer', published: true })).toBe(true);
    expect(isPublicTrailer({ type: 'film', published: true })).toBe(false);
    expect(isPublicTrailer({ type: 'trailer', published: false })).toBe(false);
  });

  it('identifies full films', () => {
    expect(isFullFilm({ type: 'film' })).toBe(true);
    expect(isFullFilm({ type: 'trailer' })).toBe(false);
  });

  it('guest play rule: trailer yes, film no', () => {
    expect(isPublicTrailer({ type: 'trailer', published: true })).toBe(true);
    expect(isPublicTrailer({ type: 'film', published: true })).toBe(false);
  });
});
