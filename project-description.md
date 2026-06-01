I am interested in the surface pressure charts on this website: https://weather.metoffice.gov.uk/maps-and-charts/surface-pressure.

When I open the chrome dev tools and inspect the network tab, they all appear as gifs.

I can even see the api calls to fetch them:
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_00.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_12.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_24.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_36.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_48.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_60.gif
https://data.consumer-digital.api.metoffice.gov.uk/v1/surface-pressure/colour/2026-06-01T1200/FSXX12T_72.gif

I want you to make a plan to make an app where I can easily view the different charts. 
I want to be able to see them on my mobile device (iPhone at the moment).
Use the frontend design skill to create a user friendly design with the following requirements:
- I should be able to navigate between the charts.
- It should be easy to zoom in on a chart to see a location in detail. 
- When I am zoomed in on a location, I want to be able to navigate to the next chart and keep the amount of zoom and the location in the center. The purpose of this is that I want to be able to compare the different charts.


update 1:
These charts show the surface pressure pattern using isobars (lines of equal pressure) and indicate areas of high (H) and low pressure (L) along with their central pressure value. Isobars are represented by solid lines. High pressure is usually associated with settled weather while low pressure is normally associated with unsettled weather. Fronts are also displayed. An analysis chart, which shows the observed state of the weather, is issued along with forecast charts up to five days ahead. These are updated every 12 hours around 0730 UTC and 1930 UTC, with the exception of charts for days four and five which are only issued once per day at 1930 UTC. The reason that these two charts are only issued once a day is because that far ahead the forecast surface pressure pattern will change more significantly, due to uncertainty at this longer time period, and there is limited value in updating it every 12 hours.
