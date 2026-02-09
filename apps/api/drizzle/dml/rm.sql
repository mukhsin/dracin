-- Clear all data from dracin-scraper database
DELETE FROM episodes;
DELETE FROM dramas;
DELETE FROM drama_scrape_status;
DELETE FROM endpoint_stats;
DELETE FROM sqlite_sequence;

SELECT 'Dramas table: ' || COUNT(*) || ' records' as result FROM dramas
UNION ALL
SELECT 'Episodes table: ' || COUNT(*) || ' records' as result FROM episodes
UNION ALL
SELECT 'Drama scrape status table: ' || COUNT(*) || ' records' as result FROM drama_scrape_status
UNION ALL
SELECT 'Endpoint stats table: ' || COUNT(*) || ' records' as result FROM endpoint_stats;
