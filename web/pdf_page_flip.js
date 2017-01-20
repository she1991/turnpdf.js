'use strict';
var PDF_PAGE_FLIP = {
	//Dimensions of the book
	flipBookWidth : -1,
	flipBookHeight : -1,
	bookPaddingWidth : 30,
	bookPaddingHeight : 10,

	//Dimensions of each page in the
	flipPageWidth : -1,
	flipPageHeight : -1,
	flipPageLeft : -1,

	//Canvas related dimensions
	CANVAS_PADDING : 60,
	page : 0,
	flipCanvas : null,
	flipCanvasContext : null,

	//Mouse co ordinates
	mouse : { x : 0, y : 0 },
	
	//flips array 
	flips : [],
	flipBook : null,
	PDFPages : [],

	flipPageY : -1,

	renderingFlag : false,

	addPDFPages : function (PDFPages){
		//Create flip objects for each of these pages
		//Two pages in one flip element.
		//'page' property holds the div on the front side of the flip
		//'pageReverse' property holds the div on the reverse side of the page
		for( var i = 0, len = PDFPages.length; i < len; i++ ){
			this.flips.push({
				//Current progress of the flip left -1 to right +1
				progress: 1,
				//The target value towards which the progress is always moving
				target: 1,
				//The page DOM related to this flip
				page: PDFPages[i].div,
				//The page reverse DOM related to this flip
				//pageReverse: ((i+1)<len)?PDFPages[ i + 1 ].div:null,
				//True while the page is being dragged
				dragging: false
			});
		}
		this.configure();
	},

	configure : function (){
		if( this.flips.length > 0 ){
			console.log(this.flips);
			//Assumes dimensions of all pages are the same!
			//Set page width and height
			this.flipPageHeight = parseInt(this.flips[0].page.style.height, 10) + 10;
			this.flipPageWidth = parseInt(this.flips[0].page.style.width, 10);
			this.flipPageLeft = parseInt(this.flips[0].page.style.left, 10);
			//Set book width and height
			this.flipBookHeight = this.flipPageHeight;// + this.bookPaddingHeight;
			this.flipBookWidth = (2*this.flipPageWidth);// + this.bookPaddingWidth;
		
			//Calculate flipPageY
			this.flipPageY = (this.flipBookHeight - this.flipPageHeight)/2;

			//Resize the canvas to match book size
			this.flipCanvas = document.getElementById('pageflip');
			//make the z-index of this canvas 2wice the number of pages in the document
			this.flipCanvas.style.zIndex = 2*this.flips.length;
			this.flipCanvasContext = this.flipCanvas.getContext('2d');

			this.flipCanvas.width = this.flipBookWidth;//this.flipBookWidth + (this.CANVAS_PADDING * 2);
			this.flipCanvas.height = this.flipBookHeight;//this.flipBookHeight + (this.CANVAS_PADDING * 2);
			//Offset the canvas so its padding is evenly spread around the book
			this.flipCanvas.style.top = '0px';//- this.CANVAS_PADDING  + 'px';
			this.flipCanvas.style.left = parseInt(this.flips[0].page.style.left, 10) - this.flipPageWidth + 'px';
			//Render page flip 60 times a second
			setInterval( this.render.bind(this), 1000/60 );

			if( this.flips.length > 1) {
				var oddFlips = [];
				for( var i = 1, len = this.flips.length; i < len; i = i + 2 ){
					//Hide this odd numbered page to begin with, it will be progressively shown on the page flip
					this.flips[i].page.style.opacity = 0;
					//Fill in this flip DOM into the preceeding index flip as pageReverse
					this.flips[i-1].pageReverse = this.flips[i].page;
					oddFlips.push(i);
				}
				//Now we remove every off flip from flips array
				while ( oddFlips.length ){
					this.flips.splice( oddFlips.pop(), 1 );
				}
			}
			console.log(this.flips);

			//add event listeners to document
			document.addEventListener( "mousemove", this.mouseMoveHandler.bind(this), false );
		        document.addEventListener( "mousedown", this.mouseDownHandler.bind(this) , false );
		        document.addEventListener( "mouseup", this.mouseUpHandler.bind(this));

		}
	},
	mouseMoveHandler : function( event ){
		// Offset mouse position so that the top of the book spine is 0,0
                this.mouse.x = event.clientX - parseInt(this.flips[0].page.style.left, 10);// + this.flipCanvas.style.left;
                this.mouse.y = event.clientY;
	},
	mouseDownHandler : function( event ){
		// Make sure the mouse pointer is inside of the book
                if (Math.abs(this.mouse.x) < parseInt(this.flips[0].page.style.left, 10)) {
                        if (this.mouse.x < 0 && this.page - 1 >= 0) {
                                // We are on the left side, drag the previous page
                                this.flips[this.page - 1].dragging = true;
				this.renderingFlag = true;
                        }
                        else if (this.mouse.x > 0 && this.page + 1 < this.flips.length) {
                                // We are on the right side, drag the current page
                                this.flips[this.page].dragging = true;
				this.renderingFlag = true;
                        }
                }

                // Prevents the text selection
                event.preventDefault();
	},
	mouseUpHandler : function( event ){
		for( var i = 0; i < this.flips.length; i++ ) {
                        // If this flip was being dragged, animate to its destination
                        if( this.flips[i].dragging ) {
                                // Figure out which page we should navigate to
                                if( this.mouse.x < 0 ) {
                                        this.flips[i].target = -1;
                                        this.page = Math.min( this.page + 1, this.flips.length );
                                }
                                else {
                                        this.flips[i].target = 1;
                                        this.page = Math.max( this.page - 1, 0 );
                                }
                        }

                        this.flips[i].dragging = false;
                }
	},
	render : function(){
		if(this.renderingFlag == false){
			return;
		}
		// Reset all pixels in the canvas
                this.flipCanvasContext.clearRect( 0, 0, this.flipCanvas.width, this.flipCanvas.height );

                for( var i = 0, len = this.flips.length; i < len; i++ ) {
                        var flip = this.flips[i];

                        if( flip.dragging ) {
                                flip.target = Math.max( Math.min( this.mouse.x / this.flipPageWidth, 1 ), -1 );
                        }

                        // Ease progress towards the target value 
                        flip.progress += ( flip.target - flip.progress ) * 0.2;

                        // If the flip is being dragged or is somewhere in the middle of the book, render it
                        if( flip.dragging || Math.abs( flip.progress ) < 0.997 ) {
                                this.drawFlip( flip );
                        }
		}
	},
	drawFlip : function( flip ){
		// Strength of the fold is strongest in the middle of the book
		var strength = 1 - Math.abs( flip.progress );
		
		// Width of the folded paper
		var foldWidth = ( this.flipPageWidth * 0.5 ) * ( 1 - flip.progress );
		
		// X position of the folded paper
		var foldX = this.flipPageWidth * flip.progress + foldWidth;
		
		// How far the page should outdent vertically due to perspective
		var verticalOutdent = 0;//20 * strength;
		
		// The maximum width of the left and right side shadows
		var paperShadowWidth = ( this.flipPageWidth * 0.5 ) * Math.max( Math.min( 1 - flip.progress, 0.5 ), 0 );
		var rightShadowWidth = ( this.flipPageWidth * 0.5 ) * Math.max( Math.min( strength, 0.5 ), 0 );
		var leftShadowWidth = ( this.flipPageWidth * 0.5 ) * Math.max( Math.min( strength, 0.5 ), 0 );
		
		
		// Change page element width to match the x position of the fold
		flip.page.style.width = Math.max(foldX - 10, 0) + "px";

		//Showing the reverse of the flip page.
                //First clear opacity value on flip pageReverse
                flip.pageReverse.style.opacity = 1;
                //Increase the z-index of this pageReverse by +1 the z-index of flip.page
                flip.pageReverse.style.zIndex = flip.page.style.zIndex + 1;
                //Adjust the left css property to align pageReverse DOM with folded piece of papaer
                flip.pageReverse.style.left = parseInt( (foldX + this.flipPageWidth) - foldWidth, 10 ) + 'px';
                //Adjust the width of this pageReverse DOM to follow the with of the fold
                flip.pageReverse.style.width = parseInt( foldWidth, 10 ) + 'px';
		
		this.flipCanvasContext.save();
		this.flipCanvasContext.translate( /*this.CANVAS_PADDING*/ + ( this.flipBookWidth / 2 ), this.flipPageY+10); //+ this.CANVAS_PADDING );
		
		
		// Draw a sharp shadow on the left side of the page
		this.flipCanvasContext.strokeStyle = 'rgba(0,0,0,'+(0.05 * strength)+')';
		this.flipCanvasContext.lineWidth = 30 * strength;
		this.flipCanvasContext.beginPath();
		this.flipCanvasContext.moveTo(foldX - foldWidth, (-verticalOutdent * 0.5)+10);
		this.flipCanvasContext.lineTo(foldX - foldWidth, this.flipPageHeight + (verticalOutdent * 0.5)+10);
		this.flipCanvasContext.stroke();
		
		
		// Right side drop shadow
		var rightShadowGradient = this.flipCanvasContext.createLinearGradient(foldX, 0, foldX + rightShadowWidth, 0);
		rightShadowGradient.addColorStop(0, 'rgba(0,0,0,'+(strength*0.2)+')');
		rightShadowGradient.addColorStop(0.8, 'rgba(0,0,0,0.0)');
		
		this.flipCanvasContext.fillStyle = rightShadowGradient;
		this.flipCanvasContext.beginPath();
		this.flipCanvasContext.moveTo(foldX, 0);
		this.flipCanvasContext.lineTo(foldX + rightShadowWidth, 0);
		this.flipCanvasContext.lineTo(foldX + rightShadowWidth, this.flipPageHeight);
		this.flipCanvasContext.lineTo(foldX, this.flipPageHeight);
		this.flipCanvasContext.fill();
		
		
		// Left side drop shadow
		var leftShadowGradient = this.flipCanvasContext.createLinearGradient(foldX - foldWidth - leftShadowWidth, 0, foldX - foldWidth, 0);
		leftShadowGradient.addColorStop(0, 'rgba(0,0,0,0.0)');
		leftShadowGradient.addColorStop(1, 'rgba(0,0,0,'+(strength*0.15)+')');
		
		this.flipCanvasContext.fillStyle = leftShadowGradient;
		this.flipCanvasContext.beginPath();
		this.flipCanvasContext.moveTo(foldX - foldWidth - leftShadowWidth, 0);
		this.flipCanvasContext.lineTo(foldX - foldWidth, 0);
		this.flipCanvasContext.lineTo(foldX - foldWidth, this.flipPageHeight);
		this.flipCanvasContext.lineTo(foldX - foldWidth - leftShadowWidth, this.flipPageHeight);
		this.flipCanvasContext.fill();
		
		
		// Gradient applied to the folded paper (highlights & shadows)
		var foldGradient = this.flipCanvasContext.createLinearGradient(foldX - paperShadowWidth, 0, foldX, 0);
		foldGradient.addColorStop(0.35, '#fafafa');
		foldGradient.addColorStop(0.73, '#eeeeee');
		foldGradient.addColorStop(0.9, '#fafafa');
		foldGradient.addColorStop(1.0, '#e2e2e2');
		
		this.flipCanvasContext.fillStyle = foldGradient;
		this.flipCanvasContext.strokeStyle = 'rgba(0,0,0,0.06)';
		this.flipCanvasContext.lineWidth = 0.5;
		
		// Draw the folded piece of paper
		this.flipCanvasContext.beginPath();
		//this.flipCanvasContext.fillStyle = 'orange';
		this.flipCanvasContext.moveTo(foldX, 0);
		this.flipCanvasContext.lineTo(foldX, this.flipPageHeight);
		this.flipCanvasContext.quadraticCurveTo(foldX, this.flipPageHeight + (verticalOutdent * 2), foldX - foldWidth, this.flipPageHeight + verticalOutdent);
		this.flipCanvasContext.lineTo(foldX - foldWidth, -verticalOutdent);
		this.flipCanvasContext.quadraticCurveTo(foldX, -verticalOutdent * 2, foldX, 0);

		this.flipCanvasContext.fill();
		this.flipCanvasContext.stroke();
		
		
		this.flipCanvasContext.restore();
	}
};
