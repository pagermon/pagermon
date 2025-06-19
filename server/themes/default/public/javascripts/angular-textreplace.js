angular.module('angular-highlight', []).directive('highlight', function() {
	var component = function(scope, element, attrs) {
		
		if (!attrs.highlightClass) {
			attrs.highlightClass = 'angular-highlight';
		}
		
		//scope.highlight has the original message
		//scope.replacement has all the replacements
		
		//scope.replacement[i].highlight shows the mode
		//scope.replacement[i].match contains the match
		//scope.replacement[i].replace contains the replacement
		
		function rexReplacer(inputHtml) {
			//Store the original HTML for later use
			var html = inputHtml;
			
			//Perform this function for every Text/Regex Match
			scope.replacement.forEach(function(textreplace) {
			
				//Fix issue with undefined variables, mostly from migrated configs.
				if (typeof textreplace.highlight !== 'undefined') {
					var thisMode = textreplace.highlight;
				} else {
					var thisMode = false;
				}
				

				
				if (thisMode == "replace") {
					//Generate Regex for replacement
					var thisRex = new RegExp(textreplace.match);
					html = html.replace(thisRex,textreplace.replace);
				} else {
					//Store match for use in label/highlight
					var match = html.match(textreplace.match);
					//Generate Regex for label/highlight, dont highlight if we are inside another html tag
					var thisRex = new RegExp('(?<!<[^>]*)'+textreplace.match+'(?![^<]*<\/a>)');
					if (thisMode) {
						html = html.replace(thisRex,'<a href="/?q='+match+'" data-toggle="popover" class="'+attrs.highlightClass+'" title="'+textreplace.replace+'" onmouseenter="$(this).tooltip(\'show\')">'+match+'</a>');
					} else {
						html = html.replace(thisRex,'<a href="/?q='+match+'" data-toggle="popover" title="'+textreplace.replace+'" onmouseenter="$(this).tooltip(\'show\')">'+match+'</a>');
					}
				}
			});
			
			//Return the elements HTML with the new, replaced html (if any)
			return html;
		}
		
		scope.$watch('replacement', function() {
			if (!scope.replacement || scope.replacement == '') {
				element.html(scope.highlight);
				return false;
			}
			
			// Find the words
			element.html(rexReplacer(scope.highlight));
		});
	};
	return {
		link: 			 component,
		replace:		 false,
		scope:			 {
			highlight:	 '=',
			replacement: '='
		}
	};
});
