'use strict';

$('.showHourly').on('click', function(event) {
  console.log('proof of life');
  console.log(event.target.id);
  const id = event.target.id;
  $('.hourlyTable').hide();
  $(`#weather${id}`).show();
  $(`#tides${id}`).show();

  // <%- include('../../layout/table.ejs', {tableData: hourly[3]}) %>
});
