[out:json][timeout:90];
(
  way["highway"]["name"~"^West (4[1-9]|5[0-4])(st|nd|rd|th) Street$"](40.753,-74.001,40.7695,-73.976);
  way["highway"]["name"="Broadway"](40.753,-74.001,40.7695,-73.976);
  way["highway"]["name"~"^(7th|Seventh) Avenue$"](40.753,-74.001,40.7695,-73.976);
  way["highway"]["name"~"^(6th|Sixth) Avenue|Avenue of the Americas$"](40.753,-74.001,40.7695,-73.976);
  way["highway"]["name"~"^(8th|Eighth) Avenue$"](40.753,-74.001,40.7695,-73.976);
);
out tags geom;
