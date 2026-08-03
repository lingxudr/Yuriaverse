# Sanka API Audit

## Anime Home
- Endpoint: `/anime/home`
- Status: 200
- Items: 15
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, poster, episodes, releaseDay, latestReleaseDate, animeId, href, otakudesuUrl

## Anime Ongoing
- Endpoint: `/anime/ongoing-anime?page=1`
- Status: 200
- Items: 25
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, poster, episodes, releaseDay, latestReleaseDate, animeId, href, otakudesuUrl

## Anime Completed
- Endpoint: `/anime/complete-anime?page=1`
- Status: 200
- Items: 25
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, episodes, score, lastReleaseDate, animeId, href, otakudesuUrl

## Anime Unlimited
- Endpoint: `/anime/unlimited`
- Status: 200
- Items: 33
- Missing: {"image":true,"title":true,"rating":true}
- Fields: startWith, animeList

## Anime Genre
- Endpoint: `/anime/genre`
- Status: 200
- Items: 36
- Missing: {"image":true,"title":false,"rating":true}
- Fields: title, genreId, href, otakudesuUrl

## Anime Genre Action
- Endpoint: `/anime/genre/action?page=1`
- Status: 200
- Items: 15
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, studios, score, episodes, season, animeId, href, otakudesuUrl, synopsis, synopsis.paragraphs, genreList

## Anime Schedule
- Endpoint: `/anime/schedule`
- Status: 200
- Items: 8
- Missing: {"image":true,"title":true,"rating":true}
- Fields: day, anime_list

## Anime Search
- Endpoint: `/anime/search/one`
- Status: 200
- Items: 15
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, status, score, animeId, href, otakudesuUrl, genreList

## Samehadaku Popular
- Endpoint: `/anime/samehadaku/popular?page=1`
- Status: 200
- Items: 30
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, type, score, status, animeId, href, samehadakuUrl, genreList

## Samehadaku Movies
- Endpoint: `/anime/samehadaku/movies?page=1&order=update`
- Status: 200
- Items: 20
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, type, score, status, animeId, href, samehadakuUrl, genreList

## Samehadaku Batch
- Endpoint: `/anime/samehadaku/batch?page=1`
- Status: 200
- Items: 30
- Missing: {"image":false,"title":false,"rating":false}
- Fields: title, poster, type, score, status, batchId, href, samehadakuUrl, genreList

## Samehadaku Detail
- Endpoint: `/anime/samehadaku/anime/one-piece`
- Status: 200
- Items: 1
- Missing: {"image":true,"title":true,"rating":true}
- Fields: 

## Donghua Ongoing
- Endpoint: `/anime/donghua/ongoing/1`
- Status: 200
- Items: 20
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, status, href, anichinUrl

## Donghua Completed
- Endpoint: `/anime/donghua/completed/1`
- Status: 200
- Items: 20
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, status, href, anichinUrl

## Donghua Latest
- Endpoint: `/anime/donghua/latest/1`
- Status: 200
- Items: 20
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, status, type, sub, href, anichinUrl

## Donghua Genres
- Endpoint: `/anime/donghua/genres`
- Status: 200
- Items: 398
- Missing: {"image":true,"title":false,"rating":true}
- Fields: name, slug, href, anichinUrl

## Donghua Genre Action
- Endpoint: `/anime/donghua/genres/action/1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, status, type, sub, href, anichinUrl

## Donghua Schedule
- Endpoint: `/anime/donghua/schedule`
- Status: 200
- Items: 7
- Missing: {"image":true,"title":true,"rating":true}
- Fields: day, donghua_list

## Donghua Detail
- Endpoint: `/anime/donghua/detail/crowned-in-a-hundred-days`
- Status: 200
- Items: 3
- Missing: {"image":true,"title":false,"rating":true}
- Fields: name, slug, href, anichinUrl

## Animasu Ongoing
- Endpoint: `/anime/animasu/ongoing?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Completed
- Endpoint: `/anime/animasu/completed?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Movies
- Endpoint: `/anime/animasu/movies?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Popular
- Endpoint: `/anime/animasu/popular?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Schedule
- Endpoint: `/anime/animasu/schedule`
- Status: 200
- Items: 14
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Live Action Search
- Endpoint: `/anime/animasu/search/live%20action?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, episode, status_or_day, type

## Animasu Detail Live Action
- Endpoint: `/anime/animasu/detail/one-piece-season-2-live-action`
- Status: 200
- Items: 5
- Missing: {"image":true,"title":false,"rating":true}
- Fields: name, slug

## Kusonime OVA
- Endpoint: `/anime/kusonime/type/ova?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, genres, released

## Kusonime ONA
- Endpoint: `/anime/kusonime/type/ona?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, genres, released

## Kusonime Special
- Endpoint: `/anime/kusonime/type/special?page=1`
- Status: 200
- Items: 10
- Missing: {"image":false,"title":false,"rating":true}
- Fields: title, slug, poster, genres, released
