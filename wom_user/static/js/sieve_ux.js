// sieve_ux.js 
// Copyright 2013 Thibauld Nion
//
// This file is part of WaterOnMars (https://github.com/tibonihoo/wateronmars).
//
// WaterOnMars is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// WaterOnMars is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with WaterOnMars.  If not, see <http://www.gnu.org/licenses/>.
//
//
// Requirements:
// - jquery v1.8.2
// - mousetrap.js v1.1.3
//
// Usage:
// Call prepareKeyBindings() in the head of the page.
// Call activateKeyBindings() at the end of the page.


// Preparation (mostly to set up some global variables)
function prepareKeyBindings()
{
  // keybindings globals
  gMouseTrapDisabled = true;
  gCurrentlyExpandedItem = -1;
  gNumReferences = 0;
  gSyncWithServer = false;
  gWaitingForServerAnswer = false;
  gReadURLs = [];
  gUserCollectionURL = "";
  gNumUnread = 0;
}

// Make sure that the item being slid out is marked as read and that
// the next item and its title are displayed correctly.
function onCarouselSlid() {  
  var newlyShownItemIdx = parseInt($(".item:visible").attr("id").slice(3));
  $(".carousel").carousel("pause");
  var previouslyShownItemIdx = gCurrentlyExpandedItem;
  if (previouslyShownItemIdx>=0) {
    var referenceId = '#ref'+previouslyShownItemIdx;
    var prevNavItem = "#ref-nav-"+previouslyShownItemIdx.toString();
    $(prevNavItem).removeClass("shown");
    markAsRead($(referenceId),previouslyShownItemIdx);  
  }
  gCurrentlyExpandedItem  = newlyShownItemIdx;
  var navItem = "#ref-nav-"+newlyShownItemIdx.toString();
  $(navItem).addClass("shown");
  ensureCorrectVisibility(navItem,"#sieve-nav");
}


// Initialize the carousel, activate its controls and plug the right callbacks.
function initializeCarousel()
{
  if (gNumReferences==0)
  {
    $(".carousel-control").hide(); 
    return;
  }
  $(".carousel-control").show(); 
  // show the right "switch" text taking into account that accordion
  // is the default view for non-touch devices
  // add event
  $(".carousel").on('slid.bs.carousel',  function () { onCarouselSlid()});
  $(".carousel").carousel("next");
  gCurrentlyExpandedItem = 0;
  $(".carousel-control.left").on('click',function (){carouselSlideToPrevious()});
  $(".carousel-control.right").on('click',function (){carouselSlideToNext()});
  $(".carousel").swipe({
    swipeLeft:function(event, direction, distance, duration, fingerCount) {
        carouselSlideToNext();
    },
    swipeRight:function(event, direction, distance, duration, fingerCount) {
      carouselSlideToPrevious();
    }
  });
}

function switchTitleListDisplay() 
{
  if ($(".title-list-switch.disabled").length) 
    hideTitleList();
  else 
    showTitleList();
}



function hideTitleList() 
{
  $(".title-list").removeClass("col-md-2");
  $(".carousel").removeClass("col-md-10");
  $(".title-list").addClass("hidden");
  $(".carousel").addClass("col-md-12");  
  $(".title-list-switch").removeClass("disabled");  
}

function showTitleList() 
{
  $(".title-list").removeClass("hidden");
  $(".carousel").removeClass("col-md-12");
  $(".title-list").addClass("col-md-2");
  $(".carousel").addClass("col-md-10");
  $(".title-list-switch").addClass("disabled");  
}


// Activation that needs to be called once the page is fully generated
// @param syncWithServer a boolean telling whether the read status
// @param userCollectionURL the url to which new bookmarks should be posted
// @param numUnread the total number of unread items
// should be synced with the server.
function activateKeyBindings(syncWithServer,userCollectionURL,numUnread)
{
  // keybindings globals
  gCurrentlyExpandedItem = -1;
  gMouseTrapDisabled = false;   
  gNumReferences = $(".wom_reference").length;
  gSyncWithServer = syncWithServer;
  gUserCollectionURL = userCollectionURL;
  gNumUnread = numUnread;
  $("#sieve-reload").on('click',function (){reloadSieve();});
  initializeCarousel();
  // check if viewed in a touch device (and if so activate the
  // carousel by default) with code taken from http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
  var isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));
  if (isTouch)
    hideTitleList();
  else
    showTitleList();
}


// Show one of the warning that are written but hidden by default on
// the page, and that are identified via their HTML id.
// WARNING: if there are several warnings, they may overlap (TODO: in
// such case use a warning counter + a shift computed accordingly)
function showWarning(warningId) {
  var warningElt = $("#"+warningId);
  warningElt.popover();
  warningElt.css({ 
    "display": "block",
  });
}

// Hide a specific warning.
function hideWarning(warningId) {
  $("#"+warningId).css("display", "none");
}

// Make sure that an element is visible by scrolling the page if
// necessary to make it appear at a comfortable place on the page.
// Note: adapted from http://stackoverflow.com/questions/487073/check-if-element-is-visible-after-scrolling 
function ensureCorrectVisibility(elem,view)
{
  var viewHeight = $(view).height();
  var viewTop = $(view).offset().top;
  var visibilityTopThreshold = viewHeight/4;
  var visibilityBottomThreshold = viewHeight/2;
  var elemTop = $(elem).offset().top - viewTop;
  if ( (elemTop <= visibilityTopThreshold) || (elemTop >= visibilityBottomThreshold) )
  {
    var scrollNewTop = elemTop-(viewHeight/4)+$(view).scrollTop();
    $(view).animate({scrollTop: scrollNewTop}, 400); 
  }
}

// Collapse the currently expanded item if any.
function collapseCurrentlyExpandedItem() {
  var currentIdx = gCurrentlyExpandedItem;
  if (currentIdx >= 0) {
    var currentIdxStr = currentIdx.toString();
    var itemToCollapse = 'collapse'+currentIdxStr;
    $('#'+itemToCollapse).collapse('hide');
  }
  return currentIdx;
}

// Expand the item corresponding to the given index
// Note: Take care of the global index tracking mechanics too.
function expandItem(idx) {
  var itemToExpand = 'collapse'+idx.toString();
  $('#'+itemToExpand).collapse('show');
}

// Generate the callback that will be called when the content of
// reference#i will be collapsed.
function createShownCallback(i) {
  return function () {
    if (!gMouseTrapDisabled) 
    {
      gCurrentlyExpandedItem = i;
    }
    else
    {
      gMouseTrapDisabled = false;
    }
    ensureCorrectVisibility("#collapse"+i.toString());
  }
}


// Generate the callback that will be called when the content of
// reference#i will be collapsed.
// Note: adapted from http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
// WARNING: doesn't reset gCurrentlyExpandedItem (to allow restarting
// to browse item from where it stopped)
function createHiddenCallback(i) {
  return function () {
    var referenceId = '#ref'+i;
    markAsRead($(referenceId),i);
  }
}


// using jQuery to get a cookie 
// (from https://docs.djangoproject.com/en/dev/ref/contrib/csrf/)
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Django-specific method to distinguish which request needs to take
// care of the crsf protection
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

// Make sure the server will know that certain items have been read
// @param read_items_urls a list of urls identifying the references
// that must be considered as read.
// @param callback function to be called when the server's answer is received
function updateReadStatusOnServer(read_items_urls, callback) {
  if (!gSyncWithServer) return;
  var jsonStr = JSON.stringify({"action": "read","references":read_items_urls})
  var csrftoken = getCookie('csrftoken');
  var currentURL = window.location.href;
  $.ajax({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function(xhr, settings) {
      if (!csrfSafeMethod(settings.type)) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    },
    type: "POST",
    url: currentURL,
    data: jsonStr,
    dataType: "json",
  }).done(callback).fail(function () {showWarning("server-sync-problem");});
}

// Send a reference's info to add it to the user's collection
// @param url reference's URL
// @param title reference's title
// @param sourceURL URL of the reference's source
// @param sourceTitle name of the reference's source
// @param callback function to be called when the server's answer is received
function saveBookmarkOnServer (url,title,sourceURL,sourceTitle,callback) {
  if (gUserCollectionURL=="") return;
  var jsonStr = JSON.stringify({"url": url, "title" : title, "source_url" : sourceURL, "source_title" : sourceTitle });
  var csrftoken = getCookie('csrftoken');
  $.ajax({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function(xhr, settings) {
      if (!csrfSafeMethod(settings.type)) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    },
    type: "POST",
    url: gUserCollectionURL,
    data: jsonStr,
    dataType: "json",
  }).done(callback).fail(function () {showWarning("server-save-failed");});
}


function updateReadingProgress() 
{
  progress = Math.round((100*gNumReferences-100*gNumUnread)/gNumReferences);
  elt = $("#reading-progress")
  elt.attr("aria-valuenow",progress.toString());
  elt.attr("style","width: "+progress.toString()+"%;height:3px;");
}

// Perform all necessary stuff to indicate that a reference should be
// considered as read.
// Note: will act only if the reference has not be marked as read yet !
// @param refElement the element representing the reference that must
// be marked as read
// @param refIdx the index of this reference (typically as indicated
// in #ref{refIdx}
function markAsRead(refElement,refIdx) {
  if ( gNumReferences>0 && !refElement.hasClass('read') ) { 
    refElement.addClass("read");
    $("#ref-nav-"+refIdx.toString()).addClass('read');
    gReadURLs.push(document.getElementById('ref'+refIdx.toString()+"-URL").href);
    rollingUpdateReadStatusOnServer(true);
    gNumUnread -= 1;
    updateReadingProgress();
  }
}

// Make sure to synchronize the read status of update on the server.
// Will continue to update the status if when the server answers, new
// items have been read.
function rollingUpdateReadStatusOnServer(check_lock) {
  if (!check_lock || !gWaitingForServerAnswer) {
    gWaitingForServerAnswer = true;
    var syncedReadURLS = gReadURLs.slice(0)
    gReadURLs = [];
    // we still upload the full *current* list of read items (if
    // there's more than one it probably means that something went
    // wrong with the latest update)
    updateReadStatusOnServer(syncedReadURLS,function (data) {         
      hideWarning("server-sync-problem");
      if (gReadURLs.length>0) {rollingUpdateReadStatusOnServer(false)} 
      else {gWaitingForServerAnswer=false;} });
  }
}

// Make sure that the user gets a visual feedback indicating that the
// reference has been saved.
// @param refIdx the index of this reference (typically as indicated
// in #ref{refIdx}
function markAsSaved(refIdx) {
  var refIdxStr = refIdx.toString();
  var refElement = $('#ref'+refIdxStr);
  if ( !refElement.hasClass('saved') ) { 
    var url = document.getElementById('ref'+refIdxStr+'-URL').href;
    var title = document.getElementById('ref'+refIdxStr+'-URL').title;
    var sourceURL = document.getElementById('ref'+refIdxStr+'-sourceURL').href;
    var sourceTitle = document.getElementById('ref'+refIdxStr+'-sourceURL').title;
    saveBookmarkOnServer(url,title,sourceURL,sourceTitle, function(data) {refElement.addClass("saved");});
  };
}


// Keybinding activation

function carouselSlideToPrevious() 
{
  if (gCurrentlyExpandedItem>0) 
  {
    $(".carousel").carousel("prev");
  }
  return true;
}

// Expand previous item
Mousetrap.bind('p', function() { 
  carouselSlideToPrevious();
  if(gMouseTrapDisabled) {return false;}
  gMouseTrapDisabled = true;
  var collapsedItemIdx = collapseCurrentlyExpandedItem();
  if (collapsedItemIdx <= 0)
  {
    // special case: we're at the begining of the list, and we want to
    // make sure that the browsing will restart with the first item.
    gCurrentlyExpandedItem = -1;
    gMouseTrapDisabled = false;
  }
  else
  {
    expandItem(collapsedItemIdx-1);
  }
});

function carouselSlideToNext() 
{
  if (gCurrentlyExpandedItem>=gNumReferences-1) 
  {
    var idx = (gNumReferences-1);
    var referenceId = '#ref' + idx.toString();
    markAsRead($(referenceId),idx);
    $('#sieve-reload-message').modal('show')
  }
  else 
  {
    $(".carousel").carousel("next");
  }
  return true;
}

// Expand next item
Mousetrap.bind('n', function() { 
  carouselSlideToNext();
  if(gMouseTrapDisabled) {return false;}
  gMouseTrapDisabled = true;
  var collapsedItemIdx = collapseCurrentlyExpandedItem();
  if (collapsedItemIdx >= gNumReferences - 1)
  {
    // special case: we're at the end of the list, and we have to set
    // gCurrentlyExpandedItem in such a way that looking at the
    // "previous" item will start by expanding the last one.
    gCurrentlyExpandedItem = gNumReferences;
    gMouseTrapDisabled = false;
    $('#sieve-reload-message').modal('show')
  }
  else
  {
    expandItem(collapsedItemIdx+1);
  }
});

// open the currently expanded items' linked page in the browser
Mousetrap.bind('v', function() { 
  var itemToShow = 'ref'+gCurrentlyExpandedItem.toString()+"-URL";
  window.open(document.getElementById(itemToShow).href);
});

// Reload the sieve but also makes sure to sync the read state of news
// items on the server before quitting page.
function reloadSieve() 
{
  $('#sieve-reload-message').modal('hide');
  var window_location = window.location;
  if (gReadURLs.length>0) {
    showWarning("news-loading");
    updateReadStatusOnServer(gReadURLs,function (data) {gReadURLs = []; window_location.reload();});
  }
  else {
    window_location.reload();
  }
}

// open the currently expanded items' linked page in the browser
Mousetrap.bind('r', function() { 
  reloadSieve();
});


// save the ref corresponding to the currently expanded items
function saveCurrentItem() {
  markAsSaved(gCurrentlyExpandedItem);
}
Mousetrap.bind('b', saveCurrentItem);
