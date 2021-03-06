
var showBegin = 14 * 60 * 60 + 6 * 60; // show starts at 6 mins past the hour

var localOff = get_show_start_hour_offset();

showBegin += (localOff * 60);

dbug = 1;

var profinp = document.getElementById("prof");
var currprof;
var backup_checkbox = document.getElementById("getbackup");
var fetchmsg = document.getElementById("fetchmsg");
var commitmsg = document.getElementById("commitmsg");
var brkproto = document.getElementById("breakproto");
var brkarea = document.getElementById("breaks");
var proflist = document.getElementById("profiles");
var exparea = document.getElementById("export");
var brk = new Array();

function fill_export_area() {

    // Export the breaks list to the export text area "exparea" as
    // JSON representing the "brk" breaks list.  If there is already
    // something in there, we PROBABLY don't want to overwrite it, so
    // check to see if there's anything there first, and confirm with
    // the user if not empty.

    if ( exparea.value.length > 0 ) {
	if ( ! confirm("The import/export area is nonempty.  Are you SURE?") ) {
	    return false;
	}
    }
    exparea.value = JSON.stringify(brk);
    return true;
}

function slurp_export_area() {

    // The export (and actually import) area "exparea" is assumed to
    // contain JSON representing the brk[] breaks list.  Obviously
    // the minimum sized list would be "[]" so check to see if the
    // size in the textarea is at least 2.

    // NOTE: At this timeNo error checking is done above and beyond
    // what JSON.parse will do, so you could end up with a totally
    // invalid breaks list.  It's assumed you "know what you're
    // doing."

    var xarea = exparea.value;
    var newbrk;

    if ( xarea.length < 2 ) {
	alert("doesn't look like there's anything to import.");
	return false;
    }

    xarea = xarea.replace(/^[ 	]*var[ 	]*defaultbrk[ 	]*=[ 	]*/, "");
    // alert("you have: >"+xarea+"<");

    try {
	newbrk = JSON.parse(xarea);
    } catch (err) {
	alert("There was an error ("+err+") trying to import that.");
	return false;
    }

    if ( brk.length > 0 ) {
	if ( ! confirm("Overwrite current breaks list?") ) {
	    return false;
	}
    }

    brk = newbrk;
    refresh_breaks();
}

function verify_break_list(ol) {

    // This approves the contents of "ol" as an array of .begin and
    // .end members.  For now, it checks if there are any breaks at
    // all, and that they do not overlap.  They can be consecutive,
    // for example a network ad followed by local ads, but [n].end
    // cannot occur AFTER [n+1].begin.  It returns either the null
    // string "" (all is OK) or an error string of what went wrong.

    var b, nb, i, l;

    l = ol.length;
    if ( l === 0 ) {
	console.warn("Not useful to have an empty break list.");
	return "no loaded breaks!!!";
    }

    l--; // always comparing with i + 1, so do not go "off the end"
    for ( i = 0; i < l; i++ ) {
	b = ol[i];
	nb = ol[i + 1];
	if ( b.end > nb.begin ) {
	    console.warn("Breaks overlap at "+i+".");
	    return "Breaks overlap at "+i+" and "+(i+1)+".";
	}
    }

    return "";
}

function commit2localStorage(clickevt) {

    // This receives the click event from the "commit" button.
    // First, back up the profile to "<name>_breaks_bak"
    // Then JSON.stringify the brk array and put it at "<name>_breaks"
    
    var profname = profinp.value;
    var errmsg;

    dbg(1, "]]]]]] requesting commit to profile "+profname);

    // check to see if a profile name has been entered
    if ( profname === undefined ||
	 profname === null ||
	 profname === "" ) {
	commitmsg.textContent = "must have a profile name to which to save!";
	return false;
    }
    errmsg = verify_break_list(brk);
    if ( errmsg !== "" ) {
	commitmsg.textContent = errmsg;
	return false;
    }

    commitmsg.textContent = "saving backup";
    // This might throw an error if the original does not exist yet...or
    // may return "null".  When I ran it once, all I saw was the "saving backup"
    // message so I'm assuming this is where it stopped.
    try {
	localStorage.setItem(profname+"_breaks_bak",
			     localStorage.getItem(profname+"_breaks"));
    } catch (err) {
	console.warn("Profile backup did not succeed: "+err);
    }
    commitmsg.textContent = "saving profile";
    localStorage.setItem(profname+"_breaks", JSON.stringify(brk));
    commitmsg.style.color = "white";
    commitmsg.textContent = 'Profile "'+profname+'" saved to localStorage.';
    // This could have created a new profile, so update the list
    find_all_profiles(proflist);
    clear_msg_after_delay(commitmsg);
}

function find_fields(hobj) {

    // Find all the working fields in the HTML object "hobj"

    var b;

    dbg(0, "finding fields");

    b = hobj.querySelector("span[name=brknumdisp]");
    hobj.brknumdisp = b;
    b = hobj.querySelector("input[name=brkbegin]");
    hobj.brkbegin = b;
    b = hobj.querySelector("span[name=locbegin]");
    hobj.locbegin = b;
    b = hobj.querySelector("input[name=brklensecs]");
    hobj.brklensecs = b;
    b = hobj.querySelector("input[name=brklentime]");
    hobj.brklentime = b;
    b = hobj.querySelector("button[name=timecalc]");
    hobj.timecalcbut = b;
    b = hobj.querySelector("button[name=secscalc]");
    hobj.secscalcbut = b;
    b = hobj.querySelector("input[name=brkend]");
    hobj.brkend = b;
    b = hobj.querySelector("span[name=locend]");
    hobj.locend = b;
    b = hobj.querySelector("button[name=save]");
    hobj.savebut = b;
    b = hobj.querySelector("span[name=beginerr]");
    hobj.beginerr = b;
    b = hobj.querySelector("span[name=calcErr]");
    hobj.calcErr = b;
    b = hobj.querySelector("button[name=save]");
    hobj.savebut = b;
    b = hobj.querySelector("button[name=samePlusHr]");
    hobj.repl = b;
    b = hobj.querySelector("button[name=undo]");
    hobj.undo = b;
    b = hobj.querySelector("button[name=rm]");
    hobj.rm = b;
    b = hobj.querySelector("span[name=miscmsg]");
    hobj.miscmsg = b;

}

function upd_local(evt) {

    // update the local begin time based on receiving the change event
    // described by "evt"

    var blk;
    var beg;

    blk = evt.target.dataroot;
    beg = hms2secs(blk.brkbegin.value);
    blk.brkbegin.value = secs2hmsStr(beg);
    blk.locbegin.textContent = secs2hmsStr(beg + showBegin);
}

function prepare_break_form(pgnode) {

    // Given the HTML page node "pgnode", prepare it for use by
    // attaching the change and click event handlers to the
    // appropriate sub-elements.  If by some programming chance there
    // are events already attached, remove these event listeners.


    var i, l;
    var pgelt; // page elements within pgnode (input fields)
    var e; // an individual element from pgelt[]
    var b; // specific break from brk[] array
    var brlen; // calculated length of break in seconds

    b = brk[pgnode.brkpos];

    find_fields(pgnode);

    pgnode.brknumdisp.textContent = pgnode.brkpos;

    try {
	pgnode.brkbegin.removeEventListener("change", upd_local, false);
	pgnode.timecalcbut.removeEventListener("click", calc_end, false);
	pgnode.secscalcbut.removeEventListener("click", calc_end, false);
	pgnode.savebut.removeEventListener("click", save_to_brk, false);
	pgnode.repl.removeEventListener("click", repl_brk_adding_hr, false);
	pgnode.undo.removeEventListener("click", perform_undo, false);
	pgnode.rm.removeEventListener("click", delete_brk, false);
    } catch (err) {
    }

    pgnode.brkbegin.addEventListener("change", upd_local, false);
    pgnode.timecalcbut.addEventListener("click", calc_end, false);
    pgnode.secscalcbut.addEventListener("click", calc_end, false);
    pgnode.savebut.addEventListener("click", save_to_brk, false);
    pgnode.repl.addEventListener("click", repl_brk_adding_hr, false);
    pgnode.undo.addEventListener("click", perform_undo, false);
    pgnode.rm.addEventListener("click", delete_brk, false);

    pgnode.brkbegin.value = secs2hmsStr(b.begin);
    pgnode.locbegin.textContent = secs2hmsStr(b.begin + showBegin);
    pgnode.brkend.value = secs2hmsStr(b.end);
    pgnode.brkend.dataroot = pgnode;
    pgnode.locend.textContent = secs2hmsStr(b.end + showBegin);

    brlen = b.end - b.begin;
    pgnode.brklensecs.value = brlen;
    pgnode.brklentime.value = secs2minsec(brlen);

    // If the structure of the page changes (such as adding or
    // removing sections of the break prototype), the node where
    // the data are being saved can change relative to (parentNode)
    // the node we get in an event handler.  Therefore, tack
    // on a "dataroot" member to the <input> and <button> elements.

    pgelt = pgnode.querySelectorAll("input");
    l = pgelt.length
    for ( i = 0; i < l; i++ ) {
	e = pgelt[i];
	// event listener might not exist yet; may be redoing this node
	try {
	    e.removeEventListener("change", flag_unsaved, false);
	} catch (err) {
	}
	e.addEventListener("change", flag_unsaved, false);
	e.dataroot = pgnode;
    }

    pgelt = pgnode.querySelectorAll("button");
    l = pgelt.length
    for ( i = 0; i < l; i++ ) {
	e = pgelt[i];
	e.dataroot = pgnode;
    }

}


function ins_blank_brk() {

    // Create a blank break form so when filled in and saved, can be
    // added to the brk[] array (which will eventually be committed to
    // localStorage)

    var pgblk;
    var nbrk = new Object();
    var i, l;
    var pgelt;
    var e;

    i = brk.length;
    if ( i > 0 ) {
	nbrk.begin = brk[i-1].end + 60;
	nbrk.end = nbrk.begin + 60;
    } else {
	nbrk.begin = 0;
	nbrk.end = 60;
    }
    brk[i] = nbrk;

    pgblk = brkproto.cloneNode(true);
    pgblk.removeAttribute("id");
    // pgblk.removeAttribute("style");
    pgblk.brkpos = i;
    prepare_break_form(pgblk);
    pgblk.setAttribute("class", "alteredBreak");
    brkarea.appendChild(pgblk);
}

function refresh_breaks(ret) {

    // refresh the nodes on the page with the current brk[] list
    // optional parameter "ret" is the HTML node corresponding to
    // brk[ret] (primarily so a message can be put in that HTML block)

    var nbrk;
    var i, l;
    var thisBreakBegin;

    dbg(1, "in refresh breaks");

    // NOTE: we really should be doing some checking, like two
    // breaks with the same begin time.  Overlapping, well...maybe

    if ( ret !== undefined ) {
	thisBreakBegin = brk[ret].begin;
    } else {
	thisBreakBegin = ret;
    }

    brk.sort(break_cmp);
    nbrk = new Array();
    l = brk.length;
    for ( i = 0; i < l; i++ ) {
	brkobj = brk[i];
	dbg(0, ">>>> considering break "+i+" which is "+brkobj);
	if ( brkobj !== null && brkobj !== undefined ) {
	    dbg(0, ">>>>>>>> pushing");
	    nbrk.push(brkobj);
	}
    }
    brk = nbrk;
    dbg(0, "I have my new breaks list");
    return populate_page(thisBreakBegin);
}

function repl_brk_adding_hr(evt) {

    // This is the click event receiver ("evt") for the "dup + 1 hr"
    // button, so "replicate break, adding one hour"

    var brkelt;
    var brkidx;
    var beg, end;
    var nbrk;
    var i, l;
    var brkobj;

    brkelt = evt.target.dataroot;
    brkidx = brkelt.brkpos;

    nbrk = new Object();
    nbrk.begin = brk[brkidx].begin + 60 * 60;
    nbrk.end = brk[brkidx].end + 60 * 60;
    brk.push(nbrk);

    brkobj = refresh_breaks(brk.length - 1);
    brkobj.scrollIntoView();
    brkobj.brkbegin.focus();
}

function clear_msg_after_delay(txtnode) {

    // Clear the message put into "txtnode" after a delay Previously,
    // this used to be a bunch of setTimeout() calls sprinkled
    // throughout the code; this consolidates all that into one place
    // so that things like a settable timeout length can be set in ONE
    // place, and also to simplify writing it (less typing).  For
    // right now, it'll be a fixed 5000 msec.

    window.setTimeout(clear_txt, 5000, txtnode);

}


function clear_txt(where) {

    // intended for the callback of a setTimeout() to clear text after
    // a time has elapsed. The node could disappear before it times
    // out, so catch the error

    try {
	where.textContent = "";
	where.style.color = "";
	where.style.background = "";
    } catch(err) {
	dbg(2, "  Could not clear text message: "+err+". sorry.");
    }
}

function flag_unsaved(evt) {

    // This changes the appearance of an altered break entry so that
    // it is visually apparent that it needs to be saved.  Also
    // unsurprisingly, this activates the "undo" button.

    var blk;

    if ( typeof evt.target === "object" ) {
	blk = evt.target.dataroot;
    } else {
	blk = evt;
    }

    blk.setAttribute("class", "alteredBreak");
    blk.undo.setAttribute("class", "undoAvail");
    blk.undo.removeAttribute("disabled");

}

function perform_undo(evt) {
    
    // back out any changes made to the break input.  This is the
    // receiver of a button click event "evt"

    var brkelt;
    var brkidx;

    brkelt = evt.target.dataroot;
    prepare_break_form(brkelt);
    brkelt.removeAttribute("class");
    brkelt.undo.removeAttribute("class");
    brkelt.undo.setAttribute("disabled", "true");
}

function save_to_brk(evt) {

    // This receives the click event "evt" when the user clicks on the
    // "save" button for a break.  It will update fields and displays
    // as required, do some minimal error checking, and save it to the
    // brk array.  Then the display gets updated by "redrawing all the
    // breaks" with refresh_breaks().

    var brkelt;
    var brkidx;
    var beg, end;
    var nbrk;
    var i, l;
    var brkobj;
    var brknode;

    brkelt = evt.target.dataroot;
    brkidx = brkelt.brkpos;
    dbg(1, ">> save req of brk["+brkidx+"]");
    beg = hms2secs(brkelt.brkbegin.value);
    end = hms2secs(brkelt.brkend.value);
    len = end - beg;

    dbg(1, ">>> checking sanity");
    if ( beg && end && chkBrkLen(brkelt, len) ) {
	dbg(1, "Looks OK, setting");
	brk[brkidx].begin = beg;
	brk[brkidx].end = end;
    } else {
	if ( beg > end ) {
	    brkelt.calcErr.textContent = "Can't end a break before you've begun! (calc?)";
	}
	dbg(1, "Break somehow unacceptable? b:"+beg+" e:"+end+" l:"+len);
	return false;
    }

    // brkelt.miscmsg.textContent = "saved.";
    // The refresh will kill this message, need to refresh then show msg 

    brknode = refresh_breaks(brkidx);

    // refresh_breaks() can return "true" instead of an HTML object.
    // It should not at this point, but it may
    if ( typeof brknode === "object" ) {
	brkelt = brknode;
	dbg(0, "attempting update "+brkelt);
	brkelt.miscmsg.textContent = "Saved.";
	// Since the breaks list is sorted, if you just altered a
	// break so it shows up somewhere else, you won't
	// see the "saved" message.
	brknode.scrollIntoView();
	clear_msg_after_delay(brkelt.miscmsg);
    }
}

function chkBrkLen(hobj, val) {
    // Check to see that "val" seems like a valid break length.  It's
    // arbitrary, but thinking breaks shorter than 10 secs and
    // greater than 30 mins are very improbable.  We get passed
    // "hobj" (HTML object) so that we can stuff an error message
    // there if needed, in the "calcErr" area.
    if ( val === false || val < 10 || val > (30 * 60) ) {
	hobj.calcErr.textContent = "That's not looking like a valid length.";
	return false;
    } else {
	hobj.calcErr.textContent = "";
	return true;
    }
}

function calc_end(evt) {

    // This receives the click event "evt" from a "calc" button

    var calcreq; // string (from button) of what type of calc was requested
    var brkelt; // HTML <div> element of break to do calcs
    var brkidx; // index into brk[] for this break
    var beg; // beginning of break seconds offset (e.g., brk[i].begin)
    var end; // end of break seconds offset
    var len; // calculated break length

    calcreq = evt.target.getAttribute("name");
    dbg(1, calcreq+" calculation requested.");
    brkelt = evt.target.dataroot;
    brkidx = brkelt.brkpos;
    beg = hms2secs(brkelt.brkbegin.value);
    

    if ( ! beg ) {
	brkelt.beginerr.textContent = "That doesn't look like a valid beginning time.";
	return false;
    } else {
	brkelt.beginerr.textContent = "";
    }

    if ( calcreq === "timecalc" ) {
	len = hms2secs(brkelt.brklentime.value);
	dbg(1, "   chose to calc with time string, brk len "+len);
	if ( chkBrkLen(brkelt, len) ) {
	    brkelt.brklensecs.value = len;
	    brkelt.brklentime.value = secs2minsec(len);
	    dbg(1, "  set seconds too");
	} else {
	    return false;
	}
	dbg(1, "   done with by mins:secs");
    } else {
	len = parseInt(brkelt.brklensecs.value);
	if ( chkBrkLen(brkelt, len) ) {
	    brkelt.brklentime.value = secs2minsec(len);
	} else {
	    return false;
	}
	dbg(1, "   so I'm supposed to add on "+len);
    }
    end = secs2hmsStr(beg+len);

    dbg(0, "break #"+brkidx+" is at "+brkelt.brkbegin.value+" which is +"+beg);
    dbg(0, "    new end "+end);
    brkelt.locbegin.textContent = secs2hmsStr(showBegin + beg);
    brkelt.brkend.value = end;
    brkelt.locend.textContent = secs2hmsStr(showBegin + beg + len);
}


function delete_brk(evt) {

    // This receives the click event "evt" from clicking a "DELETE!"
    // button, and removes this from brk[], and updates the page.  At
    // least for now, such a deletion is always confirmed (but I know
    // this can be tedious having to OK each deletion).

    var brkelt;
    var brkidx;

    brkelt = evt.target.dataroot;
    brkidx = brkelt.brkpos;

    msg = "Delete break beginning at "+brkelt.brkbegin.value+", are you SURE?";
    if ( confirm(msg) ) {
	delete(brk[brkidx]);
	// nothing yet, but soon
    }
    refresh_breaks();
}


function populate_page(ret) {

    // populate the id="breaks" part of the page.  First, remove all
    // children, then clone and populate the "prototype entry node"
    // for each break.  The optionally supplied "ret" means to return
    // a reference to the HTML node which displays the break which has
    // a brk[??].begin time of "ret"

    var i, l, b;
    var pgblk, blkitem;
    var brlen;
    var soughtnode = true; // if no node to return, just sort-of return "success"

    // empty out the display of breaks
    while ( (pgblk = brkarea.firstChild) ) {
	brkarea.removeChild(pgblk);
    }


    // put breaks from brk[] into the page by cloning the prototype
    l = brk.length;
    for ( i = 0; i < l; i++ ) {
	b = brk[i];
	dbg(1, "break "+i+" begin: "+b.begin+" end: "+b.end);
	pgblk = brkproto.cloneNode(true);
	pgblk.removeAttribute("id");
	pgblk.removeAttribute("style");
	pgblk.brkpos = i;
	prepare_break_form(pgblk);
	if ( ret !== undefined ) {
	    if ( b.begin === ret ) {
		soughtnode = pgblk;
	    }
	}
	brkarea.appendChild(pgblk);
    }

    return soughtnode;

}

function handle_fetch(evt) {

    // This receives the click event "evt" from clicking on the
    // "fetch" button, meant to fetch a profile from localStorage.  It
    // will optionally retrieve the previously committed profile by
    // appending "_bak" if the checkbox is checked.

    var i, l;
    var brklist;
    var profstr;
    var getbk = false;

    currprof = profinp.value;
    if ( currprof === undefined ||
	 currprof === null ||
	 currprof === "" ) {
	fetchmsg.textContent = "Must work with SOME profile name.";
	return false;
    } else {
	fetchmsg.textContent = "";
    }

    profstr = currprof+"_breaks";
    getbk = backup_checkbox.checked;
    if ( getbk ) {
	profstr  += "_bak";
    }

    brklist = load_breaks(profstr);
    if ( brklist === false ) {
	fetchmsg.textContent = "Sorry, profile "+currprof+
	    (getbk ? " backup" : "" ) +" doesn't exist.";
	return false;
    }

    if ( brk.length > 0 ) {
	var ovr = confirm("Overwrite currently entered breaks?");
	if ( !ovr ) {
	    return false;
	}
    }

    dbg(1, " fetched breaks, assigning to \"master\" list");
    brk = brklist;
    dbg(1, "  update (populate) the page");
    backup_checkbox.checked = false;
    exparea.value = "";
    populate_page();
    dbg(1, "    page supposedly populated.");
}


find_all_profiles(proflist);
