/* jshint moz: true */
$( document ).ready( function () {
    const API_ROOT = "https://th.wikipedia.org/w/api.php",
          API_SUFFIX = "&format=json&callback=?&continue=",
          ACTION_FLAGS = { "Accepted": 1, "Declined": 2, "Commented": 4, "Edited": 8 };

    var showHistory = function () {
        var username = $( "#username" ).val();
        $( "#error" ).hide();
        $( "#result" ).hide();
        if ( username === "" ) {
            $( "#error" ).empty();
            $( "#error" ).show();
            $( "#error" ).append( $( "<div>" )
                               .addClass( "errorbox" )
                               .text( "ไม่ได้ระบุชื่อผู้ใช้" ) );
            return;
        }

        // Clear all table rows but the first
        // (http://stackoverflow.com/a/370031/1757964)
        $( "#result table" ).find( "tr:gt(0)" ).remove();

        // Prepare the UI for showing the history
        $( "#statistics" ).empty();
        $( "#submit" )
            .prop( "disabled", true )
            .text( "กำลังโหลด..." );
        $( "#username" )
            .prop( "disabled", true );
        $( "#result" ).show();

        // Generate permalink
        // We want what's in the address bar without the ?=___ or #___ stuff
        var permalinkSubstringMatch = /[\#\?]/.exec( window.location.href );
        var permalink = window.location.href;
        if( permalinkSubstringMatch ) {
            permalink = window.location.href.substring( 0, permalinkSubstringMatch.index );
        }
        permalink += "?user=" + encodeURIComponent( username );

        // Display permalink
        $( "#permalink" )
            .empty()
            .append( "(" )
            .append( $( "<a>" )
                .attr( "href", permalink )
                .text( "ลิงก์ถาวร" ) )
            .append( "ของผลลัพธ์นี้)" );

        var baseUrl = API_ROOT + "?action=query&list=usercontribs&ucuser=" + username + "&uclimit=500&ucprop=title|timestamp|comment&ucnamespace=0|5|118&ucshow=!new" + API_SUFFIX;
        var query = function ( continueData ) {
            var queryUrl = baseUrl + continueData;
            $.getJSON( queryUrl, function ( data ) {
                if ( data.hasOwnProperty( "continue" ) ) {
                    display( data );

                    // There's some more - recurse
                    var newContinueData = "&uccontinue=" +
                        data.continue.uccontinue +
                        "&continue=" + data.continue.continue;
                    query( newContinueData );
                } else {

                    // Nothing else, so we're done
                    display( data, true );
                }
            } );
        }; // end query()

        query( "&continue=" );

        var statistics = { afch: 0, accept: 0, decline: 0, comment: 0 };
        var display = function ( data, done ) {
            data = data.query.usercontribs;
            $( "#statistics" ).text( "โหลดแล้วทั้งสิ้น " + data.length +
                                     " การแก้ไข" + ( done ? " ใกล้เสร็จแล้ว!" : "" ) );
            $.each( data, function ( index, edit ) {
                if ( !( /afch|AFCH/.test( edit.comment ) ) ) return;
                statistics.afch++;
                var link = "https://th.wikipedia.org/wiki/" +
                    encodeURIComponent( edit.title );

                // Determine the action
                var action = "Edited";
                var color = "none"; // background color
                var noRow = false;
                if ( edit.comment.indexOf( "ตีกลับฉบับร่าง:" ) > -1 ) {
                    action = "Declined";
                    color = "rgba(255, 200, 200, 0.75)";
                    statistics.decline++;
                } else if ( /กำลังเผยแพร่ฉบับร่าง|Created/.test( edit.comment ) ) {
                    action = "Accepted";
                    color = "rgba(200, 255, 200, 0.75)";
                    statistics.accept++;
                } else if ( edit.comment.indexOf( "แสดงความเห็น" ) > -1 ) {
                    action = "Commented";
                    statistics.comment++;
                } else if ( edit.comment.indexOf( "ย้าย" ) > -1 ) {
                    action = "Moved";
                    noRow = true;
                } else if ( edit.comment.indexOf( "เก็บกวาดฉบับร่าง" ) > -1 ) {
                    action = "Cleaned";
                    noRow = true;
                }

                if ( !noRow ) {
                    $( "#result table" )
                        .append( $( "<tr>" )
                                 .attr( "data-action", ACTION_FLAGS[ action ] )
                                 .append( $( "<td>" )
                                          .append( $( "<a>" )
                                                   .attr( "href",
                                                          link )
                                                   .text( edit.title ) ) )
                                 .append( $( "<td>" )
                                          .text( edit.timestamp ) )
                                 .append( $( "<td>" )
                                          .text( action )
                                          .css( "background-color", color ) ) );
                }

                if ( ( statistics.afch % 500 ) == 0 ) {
                    $( "#statistics" )
                        .text( "โหลดทั้งสิ้น " + data.length + " การแก้ไข เลือกเฉพาะที่เป็นการใช้ AFCH มา " +
                               statistics.afch + " การแก้ไขจากทั้งหมด" );
                }
            } ); // end each()

            $( "#statistics" ).empty();
            var totalReviews = statistics.accept + statistics.decline +
                statistics.comment,
                reviewPercent = totalReviews * 100 / data.length,
                formatType = function ( reviews ) {
                    return numberWithCommas( reviews ) +
                        " (" + ( 100 * reviews / totalReviews ).toFixed( 2 ) +
                        "%)";
                };
            $( "#statistics" )
                .append( "จัดการแล้ว " + numberWithCommas( statistics.afch ) +
                         " การแก้ไข")
                .append( $( "<ul>" )
                         .append( $( "<li>" )
                                  .text( "ยอมรับ: " +
                                         formatType( statistics.accept ) ) )
                         .append( $( "<li>" )
                                  .text( "ปัดตก: " +
                                         formatType( statistics.decline ) ) )
                         .append( $( "<li>" )
                                  .text( "แสดงความเห็น: " +
                                         formatType( statistics.comment ) ) ) );

            if ( done ) {
                $( "#submit" )
                    .prop( "disabled", false )
                    .text( "Submit" );
                $( "#username" )
                    .prop( "disabled", false );
                updateFiltered();
            }
        } // end display()
    }; // end showHistory()

    // Based on checkboxes, update visibility of rows
    function updateFiltered() {

        // Get which checkboxes are checked
        var enabledFiltersElements = document.querySelectorAll('input[name=filter]:checked');
        var enabledFilters = 0;
        for( var i = 0; i < enabledFiltersElements.length; i++ ) {
            enabledFilters |= parseInt( enabledFiltersElements[ i ].value );
        }

        var rows = document.querySelectorAll( "#result tr" );
        for( var i = 0, n = rows.length; i < n; i++ ) {
            rows[i].style.display = ( enabledFilters & parseInt( rows[i].dataset.action ) )
                ? "" : "none";
        }
    }

    var filterCheckboxes = document.getElementsByName( "filter" );
    for( var i = 0; i < filterCheckboxes.length; i++ ) {
        filterCheckboxes[i].addEventListener( 'click', updateFiltered );
    }

    // Bind form submission handler to submission button & username field
    $( "#submit" ).click( function () {
        showHistory()
    } );

    $( "#username" ).keyup( function ( e ) {
        if ( e.keyCode == 13 ) {

            // Enter was pressed in the username field
            showHistory();
        }
    } );

    if ( window.location.hash && window.location.hash.indexOf( "#user=" ) >= 0 ) {

        // In the past, we let the hash specify the user, like #user=Example
        $( "#username" ).val( decodeURIComponent( window.location.hash.replace( /^#user=/, "" ) ) );
        $( "#submit" ).trigger( "click" );
    } else if( window.location.search.substring( 1 ).indexOf( "user=" ) >= 0 ) {

        // Allow the user to be specified in the query string, like ?user=Example
        var userArgMatch = /&?user=([^&#]*)/.exec( window.location.search.substring( 1 ) );
        if( userArgMatch && userArgMatch[1] ) {
            $( "#username" ).val( decodeURIComponent( userArgMatch[1].replace( /\+/g, " " ).replace( /_/g, " " ) ) );
            $( "#submit" ).trigger( "click" );
        }
    }

    // Utility function; from http://stackoverflow.com/a/2901298/1757964
    function numberWithCommas( x ) {
        var parts = x.toString().split( "." );
        parts[ 0 ] = parts[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, "," );
        return parts.join( "." );
    }
} );
