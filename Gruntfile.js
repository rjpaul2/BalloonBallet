module.exports = function(grunt){

grunt.initConfig({
  	concat: {
	  	options: {
	    	separator: ';'
	  	},
	    js: {
	      src: ['js/three.js', 'js/THREE.DecalGeometry.js', 'js/cannon.min.js', 'js/jquery.min.js', 'js/TweenMax.min.js'],
	      dest: 'build/js/vendors.js',
	    },
	    css: {
	    	src: ['css/**/*.css'],
	    	dest: 'build/css/styles.css',
	    },
  	},
  	uglify: {
	    user: {
	      	files: {
	        	'build/js/scene.min.js': ['js/scene.js']
	      	}
	    },
	    vendor: {
	    	files: {
	    		'build/js/vendors.min.js': ['build/js/vendors.js']
	    	}
	    }
  	},
  	watch: {
	  	options:{livereload:true},
		js: {
			files: ['js/scene.js'],
			tasks: ['uglify:user'],
		},
		css: {
			files: ['css/**/*.css'],
			tasks: ['concat:css'],
		},
},
	express:{
		all:{
			options: {
				port:9000,
				hostname: 'localhost',
				bases: ['build/'],
				livereload: true
			}
		}
	}
});


grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-express');
grunt.registerTask('default', ['concat', 'uglify', 'express', 'watch']);
};