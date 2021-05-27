const del = require('del')
const { dest, series, src } = require('gulp')
const babel = require('gulp-babel')
const gulpConcat = require('gulp-concat')
const html2js = require('gulp-html2js')
const ngAnnotate = require('gulp-ng-annotate')
const rename = require('gulp-rename')
const terser = require('gulp-terser')
const vinylPaths = require('vinyl-paths')

const clean = () => {
    return src('dist', {
        allowEmpty: true,
    })
    .pipe(vinylPaths(del))
}

const html = () => {
    return src('src/**/*.html')
    .pipe(html2js('angular-bootstrap-multiselect-templates.js', {
        adapter: 'angular',
        base: 'src',
        name: 'btorfs.multiselect.templates',
    }))
    .pipe(dest('dist'))
}

const js = () => {
    return src([
        'src/**/*.js',
        'dist/angular-bootstrap-multiselect-templates.js',
    ])
    .pipe(babel({
        presets: ['@babel/env'],
    }))
    .pipe(ngAnnotate({
        singleQuotes: true,
    }))
    .pipe(gulpConcat('angular-bootstrap-multiselect.js'))
    .pipe(dest('dist'))
    .pipe(terser())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest('dist'))
}


module.exports = {
    default: series(clean, html, js),
    html,
    js,
}
