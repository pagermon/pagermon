angular.module('angular-highlight', []).directive('highlight', function() {
	var component = function(scope, element, attrs) {
		
		if (!attrs.highlightClass) {
			attrs.highlightClass = 'angular-highlight';
		}
		
		var replacer = function(match, item) {
			return '<a href="/?q='+match+'" class="'+attrs.highlightClass+'">'+match+'</a>';
		}
		var tokenize = function(keywords) {
			keywords = keywords.replace(new RegExp(',$','g'), '').split(',');
			var i;
			var l = keywords.length;
			for (i=0;i<l;i++) {
				keywords[i] = keywords[i].replace(new RegExp('^ | $','g'), '');
			}
			return keywords;
		}
		
		scope.$watch('keywords', function() {
			//console.log("scope.keywords",scope.keywords);
			if (!scope.keywords || scope.keywords == '') {
				element.html(scope.highlight);
				return false;
			}
			
			
			var tokenized	= tokenize(scope.keywords);
			var regex 		= new RegExp(tokenized.join('|'), 'gmi');
			
			//console.log("regex",regex);
			
			// Find the words
			var html = scope.highlight.replace(regex, replacer);
			
			element.html(html);
		});
	}
	return {
		link: 			component,
		replace:		false,
		scope:			{
			highlight:	'=',
			keywords:	'='
		}
	};
});