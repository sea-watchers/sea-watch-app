$(document).ready(function() {
  $('#reveal').on('click', function(event) {
    $('#test').toggle('slow');
  });

  $('.showHourly').on('click', function(event) {
    console.log('proof of life');
    console.log(event.target.id);
    const id = event.target.id;
    $('.hourlyTable').hide();
    $(`#weather${id}`).show();
    $(`#tides${id}`).show();
    $('#hideDetails').show();
  });

  $('#hideDetails').on('click', function() {
    $('.hourlyTable').hide();
  });

});
