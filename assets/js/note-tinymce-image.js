/**
 * Note TinyMCE Image Plugin - /assets/js/note-tinymce-image.js
 * License: GPLv2 or later
 * Copyright: Janneke Van Dorpe (iseulde), http://iseulde.com/
 *
 * @see https://github.com/iseulde/wp-front-end-editor/blob/master/js/tinymce.image.js
 *
 * We've used Janneke Van Dorpe's TinyMCE Image Plugin as a base and modified it to suit our needs.
 */

/* global tinymce */

tinymce.PluginManager.add( 'note_image', function( editor ) {
	var caption_html5_support = editor.getParam( 'html5_support' ), // Caption HTML5 support
		caption_html = editor.getParam( 'caption_html' ), // Caption HTML tags
		// Fallback to regular HTML support
		caption_itemtag = ( caption_html5_support && caption_html && caption_html.hasOwnProperty( 'itemtag' ) ) ? caption_html.itemtag : 'dl',
		caption_icontag = ( caption_html5_support && caption_html && caption_html.hasOwnProperty( 'icontag' ) ) ? caption_html.icontag : 'dt',
		caption_captiontag = ( caption_html5_support && caption_html && caption_html.hasOwnProperty( 'captiontag' )  ) ? caption_html.captiontag : 'dd';

	/**
	 * This function parses caption shortcodes within content and returns HTML.
	 */
	function parseShortcode( content ) {
		return content.replace( /(?:<p>)?\[(?:wp_)?caption([^\]]+)\]([\s\S]+?)\[\/(?:wp_)?caption\](?:<\/p>)?/g, function( a, b, c ) {
			var id, align, classes, caption, img, width,
				trim = tinymce.trim;

			id = b.match( /id=['"]([^'"]*)['"] ?/ );
			if ( id ) {
				b = b.replace( id[0], '' );
			}

			align = b.match( /align=['"]([^'"]*)['"] ?/ );
			if ( align ) {
				b = b.replace( align[0], '' );
			}

			classes = b.match( /class=['"]([^'"]*)['"] ?/ );
			if ( classes ) {
				b = b.replace( classes[0], '' );
			}

			width = b.match( /width=['"]([0-9]*)['"] ?/ );
			if ( width ) {
				b = b.replace( width[0], '' );
			}

			c = trim( c );
			img = c.match( /((?:<a [^>]+>)?<img [^>]+>(?:<\/a>)?)([\s\S]*)/i );

			if ( img && img[2] ) {
				caption = trim( img[2] );
				img = trim( img[1] );
			} else {
				// old captions shortcode style
				caption = trim( b ).replace( /caption=['"]/, '' ).replace( /['"]$/, '' );
				img = c;
			}

			id = ( id && id[1] ) ? id[1].replace( /[<>&]+/g,  '' ) : '';
			align = ( align && align[1] ) ? align[1] : 'alignnone';
			classes = ( classes && classes[1] ) ? ' ' + classes[1].replace( /[<>&]+/g,  '' ) : '';

			if ( ! width && img ) {
				width = img.match( /width=['"]([0-9]*)['"]/ );
			}

			if ( width && width[1] ) {
				width = width[1];
			}

			if ( ! width || ! caption ) {
				return c;
			}

			width = parseInt( width, 10 );
			if ( ! caption_html5_support ) {
				width += 10;
			}

			return '<div class="mceTemp">' +
				'<' + caption_itemtag + ' id="' + id + '" class="wp-caption ' + align + classes + '" style="width: ' + width + 'px">' +
					'<' + caption_icontag + ' class="wp-caption-dt">'+ img +'</' + caption_icontag + '>' +
						'<' + caption_captiontag + ' class="wp-caption-dd wp-caption-text">'+ caption +'</' + caption_captiontag + '>' +
					'</' + caption_itemtag + '>' +
			'</div>';
		} );
	}

	/**
	 * This function generates a caption shortcode based on content.
	 */
	function getShortcode( content ) {
		return content.replace( /<div (?:id="attachment_|class="mceTemp)[^>]*>([\s\S]+?)<\/div>/g, function( a, b ) {
			var out = '';

			if ( b.indexOf('<img ') === -1 ) {
				// Broken caption. The user managed to drag the image out?
				// Try to return the caption text as a paragraph.
				out = b.match( new RegExp( '<' + caption_captiontag + ' [^>]+>([\\s\\S]+?)<\\/' + caption_captiontag + '>', 'i' ) );

				if ( out && out[1] ) {
					return '<p>' + out[1] + '</p>';
				}

				return '';
			}

			// Trim and replace caption HTML
			out = tinymce.trim( b.replace( new RegExp( '<' + caption_itemtag + ' ([^>]+)>\\s*<' + caption_icontag + ' [^>]+>([\\s\\S]+?)<\\/' + caption_icontag + '>\\s*<' + caption_captiontag + ' [^>]+>([\\s\\S]*?)<\\/' + caption_captiontag + '>\\s*<\\/' + caption_itemtag + '>', 'gi' ), function( a, b, c, caption ) {
				var id, classes, align, width;

				width = c.match( /width="([0-9]*)"/ );
				width = ( width && width[1] ) ? width[1] : '';

				if ( ! width || ! caption ) {
					return c;
				}

				id = b.match( /id="([^"]*)"/ );
				id = ( id && id[1] ) ? id[1] : '';

				classes = b.match( /class="([^"]*)"/ );
				classes = ( classes && classes[1] ) ? classes[1] : '';

				align = classes.match( /align[a-z]+/i ) || 'alignnone';
				classes = classes.replace( /wp-caption ?|align[a-z]+ ?/gi, '' );

				if ( classes ) {
					classes = ' class="' + classes + '"';
				}

				caption = caption.replace( /\r\n|\r/g, '\n' ).replace( /<[a-zA-Z0-9]+( [^<>]+)?>/g, function( a ) {
					// no line breaks inside HTML tags
					return a.replace( /[\r\n\t]+/, ' ' );
				});

				// convert remaining line breaks to <br>
				caption = caption.replace( /\s*\n\s*/g, '<br />' );

				return '[caption id="' + id + '" align="' + align + '" width="' + width + '"' + classes + ']' + c + ' ' + caption + '[/caption]';
			} ) );

			if ( out.indexOf('[caption') !== 0 ) {
				// the caption html seems broken, try to find the image that may be wrapped in a link
				// and may be followed by <p> with the caption text.
				out = b.replace( /[\s\S]*?((?:<a [^>]+>)?<img [^>]+>(?:<\/a>)?)(<p>[\s\S]*<\/p>)?[\s\S]*/gi, '<p>$1</p>$2' );
			}

			return out;
		});
	}

	/**
	 * This function extracts image data (including metadata) from an image node within content.
	 */
	function extractImageData( imageNode ) {
		var classes, extraClasses, metadata, captionBlock, caption, link, width, height,
			captionClassName = [],
			dom = editor.dom,
			isIntRegExp = /^\d+$/;

		// default attributes
		metadata = {
			attachment_id: false,
			size: 'custom',
			caption: '',
			align: 'none',
			extraClasses: '',
			link: false,
			linkUrl: '',
			linkClassName: '',
			linkTargetBlank: false,
			linkRel: '',
			title: ''
		};

		metadata.url = dom.getAttrib( imageNode, 'src' );
		metadata.alt = dom.getAttrib( imageNode, 'alt' );
		metadata.title = dom.getAttrib( imageNode, 'title' );

		width = dom.getAttrib( imageNode, 'width' );
		height = dom.getAttrib( imageNode, 'height' );

		if ( ! isIntRegExp.test( width ) || parseInt( width, 10 ) < 1 ) {
			width = imageNode.naturalWidth || imageNode.width;
		}

		if ( ! isIntRegExp.test( height ) || parseInt( height, 10 ) < 1 ) {
			height = imageNode.naturalHeight || imageNode.height;
		}

		metadata.customWidth = metadata.width = width;
		metadata.customHeight = metadata.height = height;

		classes = tinymce.explode( imageNode.className, ' ' );
		extraClasses = [];

		tinymce.each( classes, function( name ) {

			if ( /^wp-image/.test( name ) ) {
				metadata.attachment_id = parseInt( name.replace( 'wp-image-', '' ), 10 );
			} else if ( /^align/.test( name ) ) {
				metadata.align = name.replace( 'align', '' );
			} else if ( /^size/.test( name ) ) {
				metadata.size = name.replace( 'size-', '' );
			} else {
				extraClasses.push( name );
			}

		} );

		metadata.extraClasses = extraClasses.join( ' ' );

		// Extract caption
		captionBlock = dom.getParents( imageNode, '.wp-caption' );

		if ( captionBlock.length ) {
			captionBlock = captionBlock[0];

			classes = captionBlock.className.split( ' ' );
			tinymce.each( classes, function( name ) {
				if ( /^align/.test( name ) ) {
					metadata.align = name.replace( 'align', '' );
				} else if ( name && name !== 'wp-caption' ) {
					captionClassName.push( name );
				}
			} );

			metadata.captionClassName = captionClassName.join( ' ' );

			caption = dom.select( '.wp-caption-dd', captionBlock );
			if ( caption.length ) {
				caption = caption[0];

				metadata.caption = editor.serializer.serialize( caption )
					.replace( /<br[^>]*>/g, '$&\n' ).replace( /^<p>/, '' ).replace( /<\/p>$/, '' );
			}
		}

		// Extract linkTo
		if ( imageNode.parentNode && imageNode.parentNode.nodeName === 'A' ) {
			link = imageNode.parentNode;
			metadata.linkUrl = dom.getAttrib( link, 'href' );
			metadata.linkTargetBlank = dom.getAttrib( link, 'target' ) === '_blank' ? true : false;
			metadata.linkRel = dom.getAttrib( link, 'rel' );
			metadata.linkClassName = link.className;
		}

		return metadata;
	}

	/**
	 * This function determines if a particular content node has text content within it.
	 */
	function hasTextContent( node ) {
		return node && !! ( node.textContent || node.innerText );
	}

	/**
	 * This function updates an image within a node based on media frame details.
	 */
	function updateImage( imageNode, imageData ) {
		var classes, className, node, html, parent, wrap, linkNode,
			captionNode, dd, dl, id, attrs, linkAttrs, width, height, align,
			dom = editor.dom;

		classes = tinymce.explode( imageData.extraClasses, ' ' );

		if ( ! classes ) {
			classes = [];
		}

		if ( ! imageData.caption ) {
			classes.push( 'align' + imageData.align );
		}

		if ( imageData.attachment_id ) {
			classes.push( 'wp-image-' + imageData.attachment_id );
			if ( imageData.size && imageData.size !== 'custom' ) {
				classes.push( 'size-' + imageData.size );
			}
		}

		width = imageData.width;
		height = imageData.height;

		if ( imageData.size === 'custom' ) {
			width = imageData.customWidth;
			height = imageData.customHeight;
		}

		attrs = {
			src: imageData.url,
			width: width || null,
			height: height || null,
			alt: imageData.alt,
			title: imageData.title || null,
			'class': classes.join( ' ' ) || null
		};

		dom.setAttribs( imageNode, attrs );

		linkAttrs = {
			href: imageData.linkUrl,
			rel: imageData.linkRel || null,
			target: imageData.linkTargetBlank ? '_blank': null,
			'class': imageData.linkClassName || null
		};

		if ( imageNode.parentNode && imageNode.parentNode.nodeName === 'A' && ! hasTextContent( imageNode.parentNode ) ) {
			// Update or remove an existing link wrapped around the image
			if ( imageData.linkUrl ) {
				dom.setAttribs( imageNode.parentNode, linkAttrs );
			} else {
				dom.remove( imageNode.parentNode, true );
			}
		} else if ( imageData.linkUrl ) {
			if ( linkNode = dom.getParent( imageNode, 'a' ) ) {
				// The image is inside a link together with other nodes,
				// or is nested in another node, move it out
				dom.insertAfter( imageNode, linkNode );
			}

			// Add link wrapped around the image
			linkNode = dom.create( 'a', linkAttrs );
			imageNode.parentNode.insertBefore( linkNode, imageNode );
			linkNode.appendChild( imageNode );
		}

		captionNode = editor.dom.getParent( imageNode, '.mceTemp' );

		if ( imageNode.parentNode && imageNode.parentNode.nodeName === 'A' && ! hasTextContent( imageNode.parentNode ) ) {
			node = imageNode.parentNode;
		} else {
			node = imageNode;
		}

		if ( imageData.caption ) {

			id = imageData.attachment_id ? 'attachment_' + imageData.attachment_id : null;
			align = 'align' + ( imageData.align || 'none' );
			className = 'wp-caption ' + align;

			if ( imageData.captionClassName ) {
				className += ' ' + imageData.captionClassName.replace( /[<>&]+/g,  '' );
			}

			if ( ! caption_html5_support ) {
				width = parseInt( width, 10 );
				width += 10;
			}

			if ( captionNode ) {
				dl = dom.select( '.wp-caption', captionNode );

				if ( dl.length ) {
					dom.setAttribs( dl, {
						id: id,
						'class': className,
						style: 'width: ' + width + 'px'
					} );
				}

				dd = dom.select( '.wp-caption-dd', captionNode );

				if ( dd.length ) {
					dom.setHTML( dd[0], imageData.caption );
				}

			} else {
				id = id ? 'id="'+ id +'" ' : '';

				// should create a new function for generating the caption markup
				html =  '<' + caption_itemtag + ' ' + id + 'class="' + className +'" style="width: '+ width +'px">' +
					'<' + caption_icontag + ' class="wp-caption-dt">' + dom.getOuterHTML( node ) + '</' + caption_icontag + '><' + caption_captiontag + ' class="wp-caption-dd wp-caption-text">'+ imageData.caption +'</' + caption_captiontag + '></' + caption_itemtag + '>';

				if ( parent = dom.getParent( node, 'p' ) ) {
					wrap = dom.create( 'div', { 'class': 'mceTemp' }, html );
					parent.parentNode.insertBefore( wrap, parent );
					dom.remove( node );

					if ( dom.isEmpty( parent ) ) {
						dom.remove( parent );
					}
				} else {
					dom.setOuterHTML( node, '<div class="mceTemp">' + html + '</div>' );
				}
			}
		} else if ( captionNode ) {
			// Remove the caption wrapper and place the image in new paragraph
			parent = dom.create( 'p' );
			captionNode.parentNode.insertBefore( parent, captionNode );
			parent.appendChild( node );
			dom.remove( captionNode );
		}

		// Trigger a media image update event
		if ( wp.media.events ) {
			wp.media.events.trigger( 'editor:image-update', {
				editor: editor,
				metadata: imageData,
				image: imageNode
			} );
		}

		// Let the editor know that a node has changed
		editor.nodeChanged();
	}

	/**
	 * This function creates a media frame, opens it, and allows for editing of an existing image
	 * within content.
	 */
	// TODO: Only create 1 frame instance (see insert plugin)
	function editImage( img ) {
		var frame, callback, metadata;

		if ( typeof wp === 'undefined' || ! wp.media ) {
			editor.execCommand( 'mceImage' );
			return;
		}

		metadata = extractImageData( img );

		// Manipulate the metadata by reference that is fed into the PostImage model used in the media modal
		wp.media.events.trigger( 'editor:image-edit', {
			editor: editor,
			metadata: metadata,
			image: img
		} );

		frame = wp.media({
			frame: 'image',
			state: 'image-details',
			metadata: metadata
		} );

		wp.media.events.trigger( 'editor:frame-create', { frame: frame } );

		callback = function( imageData ) {
			editor.focus();
			editor.undoManager.transact( function() {
				updateImage( img, imageData );
			} );
			frame.detach();
		};

		frame.state('image-details').on( 'update', callback );
		frame.state('replace-image').on( 'replace', callback );
		frame.on( 'close', function() {
			editor.focus();
			frame.detach();
		});

		frame.open();
	}

	/**
	 * This function removes an image from a node within content
	 */
	function removeImage( node ) {
		var wrap;

		if ( node.nodeName === 'DIV' && editor.dom.hasClass( node, 'mceTemp' ) ) {
			wrap = node;
		} else if ( node.nodeName === 'IMG' || node.nodeName === 'DT' || node.nodeName === 'A' ) {
			wrap = editor.dom.getParent( node, 'div.mceTemp' );
		}

		if ( wrap ) {
			if ( wrap.nextSibling ) {
				editor.selection.select( wrap.nextSibling );
			} else if ( wrap.previousSibling ) {
				editor.selection.select( wrap.previousSibling );
			} else {
				editor.selection.select( wrap.parentNode );
			}

			editor.selection.collapse( true );
			editor.nodeChanged();
			editor.dom.remove( wrap );
		} else {
			editor.dom.remove( node );
		}
	}

	/**
	 * Event Listeners
	 */

	// Editor Initilization
	editor.on( 'init', function() {
		var dom = editor.dom;

		// Add caption field to the default image dialog
		editor.on( 'wpLoadImageForm', function( event ) {
			var captionField = {
				type: 'textbox',
				flex: 1,
				name: 'caption',
				minHeight: 60,
				multiline: true,
				scroll: true,
				label: 'Image Caption' // TODO: l10n
			};

			event.data.splice( event.data.length - 1, 0, captionField );
		});

		// Fix caption parent width for images added from URL
		editor.on( 'wpNewImageRefresh', function( event ) {
			var parent, captionWidth;

			if ( parent = dom.getParent( event.node, '.wp-caption' ) ) {
				if ( ! parent.style.width ) {
					captionWidth = parseInt( event.node.clientWidth, 10 ) + 10;
					captionWidth = captionWidth ? captionWidth + 'px' : '50%';
					dom.setStyle( parent, 'width', captionWidth );
				}
			}
		});

		/**
		 * Add or edit an existing image within content after the media form has been submitted.
		 */
		editor.on( 'wpImageFormSubmit', function( event ) {
			var data = event.imgData.data,
				imgNode = event.imgData.node,
				caption = event.imgData.caption,
				captionId = '',
				captionAlign = '',
				captionWidth = '',
				wrap, parent, node, html, imgId;

			// Temp image id so we can find the node later
			data.id = '__wp-temp-img-id';
			// Cancel the original callback
			event.imgData.cancel = true;

			if ( ! data.style ) {
				data.style = null;
			}

			if ( ! data.src ) {
				// Delete the image and the caption
				if ( imgNode ) {
					if ( wrap = dom.getParent( imgNode, 'div.mceTemp' ) ) {
						dom.remove( wrap );
					} else if ( imgNode.parentNode.nodeName === 'A' ) {
						dom.remove( imgNode.parentNode );
					} else {
						dom.remove( imgNode );
					}

					editor.nodeChanged();
				}
				return;
			}

			if ( caption ) {
				caption = caption.replace( /\r\n|\r/g, '\n' ).replace( /<\/?[a-zA-Z0-9]+( [^<>]+)?>/g, function( a ) {
					// No line breaks inside HTML tags
					return a.replace( /[\r\n\t]+/, ' ' );
				});

				// Convert remaining line breaks to <br>
				caption = caption.replace( /(<br[^>]*>)\s*\n\s*/g, '$1' ).replace( /\s*\n\s*/g, '<br />' );
			}

			if ( ! imgNode ) {
				// New image inserted
				html = dom.createHTML( 'img', data );

				if ( caption ) {
					node = editor.selection.getNode();

					if ( data.width ) {
						captionWidth = parseInt( data.width, 10 );

						if ( ! caption_html5_support ) {
							captionWidth += 10;
						}

						captionWidth = ' style="width: ' + captionWidth + 'px"';
					}

					html = '<' + caption_itemtag + ' class="wp-caption alignnone"' + captionWidth + '>' +
						'<' + caption_icontag + ' class="wp-caption-dt">'+ html +'</' + caption_icontag + '><' + caption_captiontag + ' class="wp-caption-dd wp-caption-text">'+ caption +'</' + caption_captiontag + '></' + caption_itemtag + '>';

					if ( node.nodeName === 'P' ) {
						parent = node;
					} else {
						parent = dom.getParent( node, 'p' );
					}

					if ( parent && parent.nodeName === 'P' ) {
						wrap = dom.create( 'div', { 'class': 'mceTemp' }, html );
						parent.parentNode.insertBefore( wrap, parent );
						editor.selection.select( wrap );
						editor.nodeChanged();

						if ( dom.isEmpty( parent ) ) {
							dom.remove( parent );
						}
					} else {
						editor.selection.setContent( '<div class="mceTemp">' + html + '</div>' );
					}
				} else {
					editor.selection.setContent( html );
				}
			} else {
				// Edit existing image

				// Store the original image id if any
				imgId = imgNode.id || null;
				// Update the image node
				dom.setAttribs( imgNode, data );
				wrap = dom.getParent( imgNode, '.wp-caption' );

				if ( caption ) {
					if ( wrap ) {
						if ( parent = dom.select( '.wp-caption-dd', wrap )[0] ) {
							parent.innerHTML = caption;
						}
					} else {
						if ( imgNode.className ) {
							captionId = imgNode.className.match( /wp-image-([0-9]+)/ );
							captionAlign = imgNode.className.match( /align(left|right|center|none)/ );
						}

						if ( captionAlign ) {
							captionAlign = captionAlign[0];
							imgNode.className = imgNode.className.replace( /align(left|right|center|none)/g, '' );
						} else {
							captionAlign = 'alignnone';
						}

						captionAlign = ' class="wp-caption ' + captionAlign + '"';

						if ( captionId ) {
							captionId = ' id="attachment_' + captionId[1] + '"';
						}

						captionWidth = data.width || imgNode.clientWidth;

						if ( captionWidth ) {
							captionWidth = parseInt( captionWidth, 10 );

							if ( ! caption_html5_support ) {
								captionWidth += 10;
							}

							captionWidth = ' style="width: '+ captionWidth +'px"';
						}

						if ( imgNode.parentNode && imgNode.parentNode.nodeName === 'A' ) {
							html = dom.getOuterHTML( imgNode.parentNode );
							node = imgNode.parentNode;
						} else {
							html = dom.getOuterHTML( imgNode );
							node = imgNode;
						}

						html = '<' + caption_itemtag + ' ' + captionId + captionAlign + captionWidth + '>' +
							'<' + caption_icontag + ' class="wp-caption-dt">'+ html +'</' + caption_icontag + '><' + caption_captiontag + ' class="wp-caption-dd wp-caption-text">'+ caption +'</' + caption_captiontag + '></' + caption_itemtag + '>';

						if ( parent = dom.getParent( imgNode, 'p' ) ) {
							wrap = dom.create( 'div', { 'class': 'mceTemp' }, html );
							dom.insertAfter( wrap, parent );
							editor.selection.select( wrap );
							editor.nodeChanged();

							// Delete the old image node
							dom.remove( node );

							if ( dom.isEmpty( parent ) ) {
								dom.remove( parent );
							}
						} else {
							editor.selection.setContent( '<div class="mceTemp">' + html + '</div>' );
						}
					}
				} else {
					if ( wrap ) {
						// Remove the caption wrapper and place the image in new paragraph
						if ( imgNode.parentNode.nodeName === 'A' ) {
							html = dom.getOuterHTML( imgNode.parentNode );
						} else {
							html = dom.getOuterHTML( imgNode );
						}

						parent = dom.create( 'p', {}, html );
						dom.insertAfter( parent, wrap.parentNode );
						editor.selection.select( parent );
						editor.nodeChanged();
						dom.remove( wrap.parentNode );
					}
				}
			}

			imgNode = dom.get('__wp-temp-img-id');
			dom.setAttrib( imgNode, 'id', imgId );
			event.imgData.node = imgNode;
		});

		// Replace breaks and paragraphs within caption data for an image.
		editor.on( 'wpLoadImageData', function( event ) {
			var parent,
				data = event.imgData.data,
				imgNode = event.imgData.node;

			if ( parent = dom.getParent( imgNode, '.wp-caption' ) ) {
				parent = dom.select( '.wp-caption-dd', parent )[0];

				if ( parent ) {
					data.caption = editor.serializer.serialize( parent )
						.replace( /<br[^>]*>/g, '$&\n' ).replace( /^<p>/, '' ).replace( /<\/p>$/, '' );
				}
			}
		});

		// Stop images from being dragged outside of the caption wrapper elements
		dom.bind( editor.getDoc(), 'dragstart', function( event ) {
			var node = editor.selection.getNode();

			// Prevent dragging images out of the caption elements
			if ( node.nodeName === 'IMG' && dom.getParent( node, '.wp-caption' ) ) {
				event.preventDefault();
			}
		});

		// Prevent IE11 from making .wp-caption resizable
		if ( tinymce.Env.ie && tinymce.Env.ie > 10 ) {
			// The 'mscontrolselect' event is supported only in IE11+
			dom.bind( editor.getBody(), 'mscontrolselect', function( event ) {
				if ( event.target.nodeName === 'IMG' && dom.getParent( event.target, '.wp-caption' ) ) {
					// Hide the thick border with resize handles around .wp-caption
					editor.getBody().focus(); // :(
				} else if ( dom.hasClass( event.target, 'wp-caption' ) ) {
					// Trigger the thick border with resize handles...
					// This will make the caption text editable.
					event.target.focus();
				}
			});

			editor.on( 'click', function( event ) {
				if ( event.target.nodeName === 'IMG' && dom.getAttrib( event.target, 'data-wp-imgselect' ) &&
					dom.getParent( event.target, '.wp-caption' ) ) {

					editor.getBody().focus();
				}
			});
		}
	});

	/**
	 * This function listens for when images are resized and calculates the correct width.
	 */
	editor.on( 'ObjectResized', function( event ) {
		var node = event.target;

		// Images only
		if ( node.nodeName === 'IMG' ) {
			editor.undoManager.transact( function() {
				var parent, width,
					dom = editor.dom;

				node.className = node.className.replace( /\bsize-[^ ]+/, '' );

				// Image is inside of a caption
				if ( parent = dom.getParent( node, '.wp-caption' ) ) {
					width = event.width || dom.getAttrib( node, 'width' );

					if ( width ) {
						width = parseInt( width, 10 );

						// Add "padding" to width
						if ( ! caption_html5_support ) {
							width += 10;
						}

						// Add the width to the caption element
						dom.setStyle( parent, 'width', width + 'px' );
					}
				}
			});
		}
	});

	/**
	 * This function is triggered before a command is executed on the editor, specifically
	 * when mceInsertContent is triggered and we're inside of a caption element.
	 */
	editor.on( 'BeforeExecCommand', function( event ) {
		var node, p, wp_caption, align,
			cmd = event.command,
			dom = editor.dom;

		// Insertion of content
		if ( cmd === 'mceInsertContent' ) {
			// When inserting content, if the caret is inside a caption create new paragraph under
			// and move the caret there
			if ( node = dom.getParent( editor.selection.getNode(), 'div.mceTemp' ) ) {
				p = dom.create( 'p' );
				dom.insertAfter( p, node );
				editor.selection.setCursorLocation( p, 0 );
				editor.nodeChanged();
			}
		// Justifying/Aligning content
		} else if ( cmd === 'JustifyLeft' || cmd === 'JustifyRight' || cmd === 'JustifyCenter' || cmd === 'alignnone' ) {
			node = editor.selection.getNode();
			align = 'align' + cmd.slice( 7 ).toLowerCase(); // Find the correct CSS class, i.e. alignleft, or aligncenter
			wp_caption = editor.dom.getParent( node, '.wp-caption' );

			// Only on images
			if ( node.nodeName !== 'IMG' && ! wp_caption ) {
				return;
			}

			node = wp_caption || node;

			'alignleft' !== align && editor.dom.removeClass( node, 'alignleft' );
			'aligncenter' !== align && editor.dom.removeClass( node, 'aligncenter' );
			'alignright' !== align && editor.dom.removeClass( node, 'alignright' );
			'alignnone' !== align && editor.dom.toggleClass( node, align );

			editor.nodeChanged();

			event.preventDefault();
		}
	});

	/**
	 * This function listens for when the enter, delete, or backspace keys are pressed when
	 * images or captions are the active node.
	 */
	editor.on( 'keydown', function( event ) {
		var node, wrap, P, spacer,
			selection = editor.selection,
			keyCode = event.keyCode,
			dom = editor.dom;

		if ( keyCode === tinymce.util.VK.ENTER ) {
			// When pressing Enter inside a caption move the caret to a new parapraph under it
			node = selection.getNode();
			wrap = dom.getParent( node, 'div.mceTemp' );

			if ( wrap ) {
				dom.events.cancel( event ); // Doesn't cancel all :(

				// Remove any extra dt and dd cleated on pressing Enter...
				tinymce.each( dom.select( '.wp-caption-dt, .wp-caption-dd', wrap ), function( element ) {
					if ( dom.isEmpty( element ) ) {
						dom.remove( element );
					}
				});

				spacer = tinymce.Env.ie && tinymce.Env.ie < 11 ? '' : '<br data-mce-bogus="1" />';
				P = dom.create( 'p', null, spacer );

				if ( node.nodeName === 'DD' ) {
					dom.insertAfter( P, wrap );
				} else {
					wrap.parentNode.insertBefore( P, wrap );
				}

				editor.nodeChanged();
				selection.setCursorLocation( P, 0 );
			}
		// On delete or backspace, remove the image
		} else if ( keyCode === tinymce.util.VK.DELETE || keyCode === tinymce.util.VK.BACKSPACE ) {
			node = selection.getNode();

			if ( node.nodeName === 'DIV' && dom.hasClass( node, 'mceTemp' ) ) {
				wrap = node;
			} else if ( node.nodeName === 'IMG' || node.nodeName === 'DT' || node.nodeName === 'A' ) {
				wrap = dom.getParent( node, 'div.mceTemp' );
			}

			if ( wrap ) {
				dom.events.cancel( event );
				removeImage( node );
				return false;
			}
		}
	});

	// Allow the editor to parse caption shortcodes
	editor.wpSetImgCaption = function( content ) {
		return parseShortcode( content );
	};

	// Allow the editor to get/generate caption shortcodes
	editor.wpGetImgCaption = function( content ) {
		return getShortcode( content );
	};

	/**
	 * This function fires before the content in the editor is set and parses caption shortcodes
	 * if the event format is not raw.
	 */
	editor.on( 'BeforeSetContent', function( event ) {
		if ( event.format !== 'raw' ) {
			event.content = editor.wpSetImgCaption( event.content );
		}
	});

	/**
	 * This function fires after the content has been processed by the editor and generates
	 * caption shortcodes if necessary.
	 */
	editor.on( 'PostProcess', function( event ) {
		if ( event.get ) {
			event.content = editor.wpGetImgCaption( event.content );
			event.content = event.content.replace( / data-wp-imgselect="1"/g, '' );
		}
	});

	/**
	 * Add a button to the editor to remove images.
	 */
	editor.addButton( 'remove', {
		tooltip: 'Remove', // TODO: i18n, l10n
		icon: 'dashicons-no',
		onclick: function() {
			removeImage( editor.selection.getNode() );
		}
	} );

	/**
	 * Add a button to the editor to edit images.
	 */
	editor.addButton( 'edit', {
		tooltip: 'Edit', // TODO: i18n, l10n
		icon: 'dashicons-edit',
		onclick: function() {
			editImage( editor.selection.getNode() );
		}
	} );

	/*
	 * Add alignment buttons to the toolbar when images are selected within the editor.
	 */
	tinymce.each( {
		alignleft: 'Align Left', // TODO: i18n, l10n
		aligncenter: 'Align Center', // TODO: i18n, l10n
		alignright: 'Align Right', // TODO: i18n, l10n
		alignnone: 'Don’t Align' // TODO: i18n, l10n
	}, function( tooltip, name ) {
		var direction = name.slice( 5 );

		editor.addButton( 'img' + name, {
			tooltip: tooltip,
			icon: 'dashicons-align-' + direction,
			cmd: 'alignnone' === name ? name : 'Justify' + direction.slice( 0, 1 ).toUpperCase() + direction.slice( 1 ),
			// After the buttons are rendered
			onPostRender: function() {
				var self = this;

				// Listen for node changes
				editor.on( 'NodeChange', function( event ) {
					var node = editor.dom.getParent( event.element, '.wp-caption' ) || event.element;

					// Activate alignnone if the current node doesn't have any other alignment CSS classes
					if ( 'alignnone' === name ) {
						self.active( ! editor.dom.hasClass( node, 'alignleft' ) &&
							! editor.dom.hasClass( node, 'aligncenter' ) &&
							! editor.dom.hasClass( node, 'alignright' ) );
					// All other alignment options, set active if the node has the correct CSS class
					} else {
						self.active( editor.dom.hasClass( node, name ) );
					}
				} );
			}
		} );
	} );

	return {
		_do_shcode: parseShortcode,
		_get_shcode: getShortcode
	};
});