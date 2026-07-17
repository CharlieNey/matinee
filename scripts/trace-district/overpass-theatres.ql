[out:json][timeout:90];
(
  nwr["amenity"="theatre"](40.752,-74.000,40.775,-73.975);
  nwr["name"~"TKTS",i](40.752,-74.000,40.775,-73.975);
);
out tags geom;
