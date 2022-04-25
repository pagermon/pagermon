angular.module('angular-highlight', []).directive('highlight', function() {
	var component = function(scope, element, attrs) {
		
		if (!attrs.highlightClass) {
			attrs.highlightClass = 'angular-highlight';
		}
		
		function arrSearch(nameKey, myArray){
		    for (var i=0; i < myArray.length; i++) {
		    	var rx = new RegExp(myArray[i].match, "gi");
		        if (nameKey.search(rx) > -1) {
		            return myArray[i];
		        }
		    }
		}
		
		var rReplacer = function(match, item) {
			var resultObject = arrSearch(match, scope.replacement);
			
			//Fix issue with undefined variables, mostly from migrated configs.
			if (typeof resultObject.highlight !== 'undefined') {
				var thisMode = resultObject.highlight;
			} else {
				var thisMode = false;
			}

			if (thisMode == "replace") {
				var thisRex = new RegExp(resultObject.match)
				var html = match.replace(thisRex,resultObject.replace);
			} else if (thisMode) {
				var html = '<a href="/?q='+match+'" data-toggle="popover" class="'+attrs.highlightClass+'" title="'+resultObject.replace+'" onmouseenter="$(this).tooltip(\'show\')">'+match+'</a>';
			} else {
				var html = '<a href="/?q='+match+'" data-toggle="popover" title="'+resultObject.replace+'" onmouseenter="$(this).tooltip(\'show\')">'+match+'</a>';
			}
			return html;
		};
		var rTokenize = function(keywords) {
			var i;
			var l = keywords.length;
			var keyArr = [];
			for (i=0;i<l;i++) {
				keyArr.push(keywords[i].match.replace(new RegExp('^ | $','g'), ''));
			}
			return keyArr;
		};
		
		scope.$watch('replacement', function() {
			if (!scope.replacement || scope.replacement == '') {
				element.html(scope.highlight);
				return false;
			}
			
			var rTokenized	= rTokenize(scope.replacement);
			var rRegex 		= new RegExp(rTokenized.join('|'), 'gmi');
			
			// Find the words
			var html = scope.highlight.replace(rRegex, rReplacer);
			element.html(html);
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
