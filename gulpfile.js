// Runtime
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const gulpif = require('gulp-if');
const filter = require('gulp-filter');
const lazypipe = require('lazypipe');
const size = require('gulp-size');
const del = require('del');
const path = require('path');
const browserSync = require('browser-sync');

// HTML
const nunjucks = require('gulp-nunjucks-render');
const grayMatter = require('gulp-gray-matter');
const processInline = require('gulp-process-inline');
const HTMLmin = require('gulp-htmlmin');

// JS
const rollup = require('gulp-rollup-file');
const resolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');
const buble = require('rollup-plugin-buble');
const eslint = require('gulp-eslint');

// CSS
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const postcssContext = require('postcss-plugin-context');
const normalize = require('postcss-normalize');
const responsiveType = require('postcss-responsive-type');
const customMedia = require('postcss-custom-media');

// Other
const imagemin = require('gulp-imagemin');

const ENV = process.env.NODE_ENV,
      BUILDS = {
        content: {
          task: 'build:content',
          src: 'src/_content/**/*',
          watch: '_content/**/*',
          dest: 'dist/_content'
        },
        views: {
          task: 'build:views',
          src: [ 'src/*.html', '!src/_base.html' ],
          watch: 'src/*.html',
          dest: 'dist'
        },
        components: {
          task: 'build:components',
          src: 'src/components/**/*.html',
          watch: 'src/components/**/*',
          dest: 'dist/components'
        },
        assets: {
          task: 'build:assets',
          src: 'src/assets/**/*',
          watch: 'src/assets/**/*',
          dest: 'dist/assets'
        }
      },
      OPTIONS = {
        nunjucks: {
          path: 'src'
        },
        rollup: {
          plugins: [
            resolve({ main: true, browser: true }),
            commonJs(),
            buble({
              transforms: {
                modules: false
              },
              exclude: 'node_modules/**/*'
            })
          ],
          format: 'iife',
          moduleName: 'simplaio'
        },
        postcss: [
          responsiveType(),
          customMedia(),
          autoprefixer(),
          postcssContext({
            normalize: normalize()
          })
        ],
        eslint: {
          fix: true
        },
        HTMLmin: {
          removeComments: true,
          removeCommentsFromCDATA: true,
          collapseWhitespace: true,
          conservativeCollapse: true,
          caseSensitive: true,
          keepClosingSlash: true,
          customAttrAssign: [/\$=/],
          minifyCSS: true,
          minifyJS: true
        },
        inline: {
          compress: false,
          swallowErrors: true
        },
        browserSync: {
          server: {
            baseDir: 'dist',
            serveStaticOptions: {
              extensions: [ 'html' ]
            }
          },
          open: false,
          notify: false
        },
        size: {
          gzip: true
        }
      },
      FILTERS = {
        images: file => /\.(jpg|jpeg|png|gif|)$/.test(file.path)
      };

/**
 * Custom error notifier
 * @return {Stream} Patched stream
 */
function errorNotifier() {
  return plumber({
    errorHandler: notify.onError('Error: <%= error.message %>')
  });
}

/**
 * Main HTML build pipeline for HTML files
 */
const HTMLBuild = lazypipe()
  .pipe(() => processInline().extract('script'))
  .pipe(rollup, OPTIONS.rollup)
  .pipe(() => processInline().restore())
  .pipe(() => processInline().extract('style'))
  .pipe(postcss, OPTIONS.postcss)
  .pipe(() => processInline().restore())
  .pipe(() => gulpif(ENV === 'production',
    HTMLmin(OPTIONS.HTMLmin),
    eslint(OPTIONS.eslint))
  )
  .pipe(size, OPTIONS.size);

/**
 * Content build
 * Copies content and optimizes images
 */
gulp.task(BUILDS.content.task, () => {
  const images = filter(FILTERS.images, { restore: true });

  return gulp.src(BUILDS.content.src)
    .pipe(errorNotifier())
    .pipe(images)
    .pipe(imagemin())
    .pipe(images.restore)
    .pipe(gulp.dest(BUILDS.content.dest));
});

/**
 * Views build
 * Compiles nunjucks view templates
 */
gulp.task(BUILDS.views.task, () => {
  return gulp.src(BUILDS.views.src)
    .pipe(errorNotifier())
    .pipe(grayMatter())
    .pipe(nunjucks(OPTIONS.nunjucks))
    .pipe(HTMLBuild())
    .pipe(gulp.dest(BUILDS.views.dest));
});

/**
 * Components build
 * Runs HTML pipeline on components
 */
gulp.task(BUILDS.components.task, () => {
  return gulp.src(BUILDS.components.src)
    .pipe(errorNotifier())
    .pipe(HTMLBuild())
    .pipe(gulp.dest(BUILDS.components.dest));
});

/**
 * Assets build
 * Copies assets and optimizes images
 */
gulp.task(BUILDS.assets.task, () => {
  const images = filter(FILTERS.images, { restore: true });

  return gulp.src(BUILDS.assets.src)
    .pipe(errorNotifier())
    .pipe(images)
    .pipe(imagemin())
    .pipe(images.restore)
    .pipe(gulp.dest(BUILDS.assets.dest));
});

/**
 * Main build
 * Utility task to run all builds
 */
gulp.task('build', gulp.parallel(Object.keys(BUILDS).map(build => BUILDS[build].task)));

/**
 * Gulp watchers
 * Runs tasks on changes, deletes files on removal
 */
gulp.task('watch', () => {
  Object.keys(BUILDS).forEach(build => {
    const config = BUILDS[build],
          watcher = gulp.watch(config.watch, gulp.series(config.task, 'serve:refresh'));

    watcher.on('unlink', filePath => {
      del.sync(path.resolve(config.dest, filePath));
    });
  });
});

/**
 * Serve locally with BrowserSync
 */
gulp.task('serve', () => browserSync(OPTIONS.browserSync));
gulp.task('serve:refresh', done => {
  browserSync.reload();
  done();
});

/**
 * Minify Bower components for production
 * Called on postinstall hook by Bower
 */
gulp.task('bower:minify', () => {
  return gulp.src('./dist/bower_components/**/*.html')
    .pipe(HTMLmin(OPTIONS.HTMLmin))
    .pipe(gulp.dest('dist/bower_components'));
});

gulp.task('default', gulp.parallel('build', 'serve', 'watch'));
