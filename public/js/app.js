$(document).ready(function() {
  $('#reveal').on('click', function(event) {
    $('#test').toggle('slow');
  });

  $('.showHourly').on('click', function(event) {
    const id = event.target.id;
    $('.hourlyTable').hide();
    $(`#weather${id}`).show();
    $(`#tides${id}`).show();
    $('#hideDetails').show();
  });

  $('#hideDetails').on('click', function() {
    $('.hourlyTable').hide();
  });

  $('.boatAnimate').on('click', function() {
    $('.boat_image').css('webkitAnimationPlayState', 'running');
  })
});
