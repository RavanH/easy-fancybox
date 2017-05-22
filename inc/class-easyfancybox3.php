<?php
/**
 * Easy FancyBox Class
 */
class easyFancyBox3 {

	private static $plugin_url;

	protected static $plugin_basename;

	public static $options;

	private static $defaults = array(
		// Animation duration in ms
		'speed' => 330,
		// Enable infinite gallery navigation
		'loop' => true,
		// Should zoom animation change opacity, too
		// If opacity is 'auto', then fade-out if image and thumbnail have different aspect ratios
		'opacity' => 'auto',
		// Space around image, ignored if zoomed-in or viewport smaller than 800px
		'margin' => array(44, 0),
		// Horizontal space between slides
		'gutter' => 30,
		// Should display toolbars
		'infobar' => true,
		'buttons' => true,
		// What buttons should appear in the toolbar
		'slideShow'  => true,
		'fullScreen' => true,
		'thumbs'     => true,
		'closeBtn'   => true,
		// Should apply small close button at top right corner of the content
		// If 'auto' - will be set for content having type 'html', 'inline' or 'ajax'
		'smallBtn' => 'auto',
		// Enable gestures (tap, zoom, pan and pinch)
		'touch' => true,
		// Enable keyboard navigation
		'keyboard' => true,
		// Try to focus on first focusable element after opening
		'focus' => true,
		// Close when clicked outside of the content
		'closeClickOutside' => true,
		'image' => array(
			// Wait for images to load before displaying
			// Requires predefined image dimensions
			// If 'auto' - will zoom in thumbnail if 'width' and 'height' attributes are found
			'preload' => 'auto',
			// Protect an image from downloading by right-click
			'protect' => false
		),
		'iframe' => array(
			'preload' => true,
			// Scrolling attribute for iframe tag
			'scrolling' => 'no',
			// Custom CSS styling for iframe wrapping element
			'css' => array()
		),
	);

	/**********************
	   MAIN SCRIPT OUTPUT
	 **********************/

	public static function main_script() {

		$options = (array)get_option('fancybox_3_settings', array());

		echo '
<!-- Easy FancyBox ' . EASY_FANCYBOX_VERSION . ' using FancyBox ' . FANCYBOX_VERSION . ' - RavanH (http://status301.net/wordpress-plugins/easy-fancybox/) -->';

		// begin output FancyBox settings
		echo '
<script type="text/javascript">
/* <![CDATA[ */ ';

		/*
		 * Global settings routine
		 */
		foreach ($options as $option => $setting) {
			echo '
jQuery.fancybox.defaults. ' .	$option . ' = ' . wp_json_encode($setting) . ';';
		};

		echo '
var easy_fancybox_handler = function(){';

		foreach (self::$options as $key => $value) {
			// check if not enabled or hide=true then skip
			if ( isset($value['hide']) || !get_option(self::$options['Global']['options']['Enable']['options'][$key]['id'], self::$options['Global']['options']['Enable']['options'][$key]['default']) )
				continue;

			echo '
	/* ' . $key . ' */';
			/*
			 * Auto-detection routines (2x)
			 */
			$autoAttribute = (isset($value['options']['autoAttribute'])) ? get_option( $value['options']['autoAttribute']['id'], $value['options']['autoAttribute']['default'] ) : "";

			if(!empty($autoAttribute)) {
				if(is_numeric($autoAttribute)) {
					echo '
	jQuery(\''.$value['options']['autoAttribute']['selector'].'\').not(\'.nolightbox\').addClass(\''.$value['options']['class']['default'].'\');';
				} else {
					// set selectors
					$file_types = array_filter( explode( ' ', str_replace( ',', ' ', $autoAttribute ) ) );
					$more=0;
					echo '
	var fb_'.$key.'_select = \'';
					foreach ($file_types as $type) {
						if ($type == "jpg" || $type == "jpeg" || $type == "png" || $type == "gif")
							$type = '.'.$type;
						if ($more>0)
							echo ', ';
						echo 'a['.$value['options']['autoAttribute']['selector'].'"'.$type.'"]:not(.nolightbox,li.nolightbox>a), area['.$value['options']['autoAttribute']['selector'].'"'.$type.'"]:not(.nolightbox)';
						$more++;
					}
					echo '\';';

					// class and rel depending on settings
					if( '1' == get_option($value['options']['autoAttributeLimit']['id'],$value['options']['autoAttributeLimit']['default']) ) {
						// add class
						echo '
	var fb_'.$key.'_sections = jQuery(\''.get_option($value['options']['autoSelector']['id'],$value['options']['autoSelector']['default']).'\');
	fb_'.$key.'_sections.each(function() { jQuery(this).find(fb_'.$key.'_select).addClass(\''.$value['options']['class']['default'].'\')';
						// and set rel
						switch( get_option($value['options']['autoGallery']['id'],$value['options']['autoGallery']['default']) ) {
							case '':
							default :
								echo '; });';
								break;
							case '1':
								echo '.attr(\'rel\', \'gallery-\' + fb_'.$key.'_sections.index(this)); });';
								break;
							case '2':
								echo '.attr(\'rel\', \'gallery\'); });';
						}
					} else {
						// add class
						echo '
	jQuery(fb_'.$key.'_select).addClass(\''.$value['options']['class']['default'].'\')';
						// set rel
						switch( get_option($value['options']['autoGallery']['id'],$value['options']['autoGallery']['default']) ) {
							case '':
							default :
								echo ';';
								break;
							case '1':
								echo ';
	var fb_'.$key.'_sections = jQuery(\''.get_option($value['options']['autoSelector']['id'],$value['options']['autoSelector']['default']).'\');
	fb_'.$key.'_sections.each(function() { jQuery(this).find(fb_'.$key.'_select).attr(\'rel\', \'gallery-\' + fb_'.$key.'_sections.index(this)); });';
								break;
							case '2':
								echo '.attr(\'rel\', \'gallery\');';
						}
					}

				}
			}

			/*
			 * Generate .fancybox() bind
			 */

			// prepare auto popup
			if( $key == $autoClick )
				$trigger = $value['options']['class']['default'];

			echo '
	jQuery(\'' . $value['options']['tag']['default']. '\')';

			// use each() to allow different metadata values per instance; fix by Elron. Thanks!
			if ( '1' == get_option(self::$options['Global']['options']['Miscellaneous']['options']['metaData']['id'],self::$options['Global']['options']['Miscellaneous']['options']['metaData']['default']) )
				echo '.each(function() { jQuery(this)';

			echo '.fancybox( jQuery.extend({}, fb_opts, {';
			$more=0;
			foreach ($value['options'] as $_key => $_value) {
				if (isset($_value['id']) || isset($_value['default']))
					$parm = (isset($_value['id']))? get_option($_value['id'], $_value['default']) : $_value['default'];
				else
					$parm = '';

				if( isset($_value['input']) && 'checkbox'==$_value['input'] )
					$parm = ( '1' == $parm ) ? 'true' : 'false';

				if( !isset($_value['hide']) && $parm!='' ) {
					$quote = (is_numeric($parm) || (isset($_value['noquotes']) && $_value['noquotes'] == true) ) ? '' : '\'';
					if ($more>0)
						echo ',';
					echo ' \''.$_key.'\' : ';
					echo $quote.$parm.$quote;
					$more++;
				}
			}
			echo ' }) ';

			// use each() to allow different metadata values per instance; fix by Elron. Thanks!
			if ( '1' == get_option(self::$options['Global']['options']['Miscellaneous']['options']['metaData']['id'],self::$options['Global']['options']['Miscellaneous']['options']['metaData']['default']) )
				echo ');} ';

			echo ');';

		}

			echo '
}
var easy_fancybox_auto = function(){';

		if ( empty($delayClick) ) $delayClick = '0';

		switch( $autoClick ) {
			case '':
				break;
			case '1':
				echo '
	/* Auto-click */
	setTimeout(function(){jQuery(\'#fancybox-auto\').trigger(\'click\')},'.$delayClick.');';
				break;
			case '99':
				echo '
	/* Auto-click */
	setTimeout(function(){jQuery(\'a[class|="fancybox"]\').filter(\':first\').trigger(\'click\')},'.$delayClick.');';
				break;
			default :
				if ( !empty($trigger) ) echo '
	/* Auto-click */
	setTimeout(function(){jQuery(\'a[class*="'.$trigger.'"]\').filter(\':first\').trigger(\'click\')},'.$delayClick.');';
		}

		echo '
}
/* ]]> */
</script>
';

		// HEADER STYLES //

		// customized styles
		$styles = '';
		if (isset($overlaySpotlight) && 'true' == $overlaySpotlight)
			$styles .= '
#fancybox-overlay{background-attachment:fixed;background-image:url("' . self::$plugin_url . 'images/light-mask.png");background-position:center;background-repeat:no-repeat;background-size:100% 100%}';
		if (!empty($borderRadius))
			$styles .= '
#fancybox-outer,#fancybox-content{border-radius:'.$borderRadius.'px}.fancybox-title-inside{padding-top:'.$borderRadius.'px;margin-top:-'.$borderRadius.'px !important;border-radius: 0 0 '.$borderRadius.'px '.$borderRadius.'px}';
		if (!empty($backgroundColor))
			$styles .= '
#fancybox-content{background-color:'.$backgroundColor.'}';
		if (!empty($paddingColor))
			$styles .= '
#fancybox-content{border-color:'.$paddingColor.'}#fancybox-outer{background-color:'.$paddingColor.'}'; //.fancybox-title-inside{background-color:'.$paddingColor.';margin-left:0 !important;margin-right:0 !important;width:100% !important;}
		if (!empty($textColor))
			$styles .= '
#fancybox-content{color:'.$textColor.'}';
		if (!empty($titleColor))
			$styles .= '
#fancybox-title,#fancybox-title-float-main{color:'.$titleColor.'}';

		if ( !empty($styles) ) {
			echo '<style type="text/css">' . $styles . '
</style>
';
		}
	}

	/***********************
	    ACTIONS & FILTERS
	 ***********************/

	public static function register_scripts() {
	  if ( is_admin() ) return;

		// ENQUEUE
		// first get rid of previously registered variants of jquery.fancybox by other plugins or theme
		wp_deregister_script('fancybox');
		wp_deregister_script('jquery.fancybox');
		wp_deregister_script('jquery_fancybox');
		wp_deregister_script('jquery-fancybox');

		// register main fancybox script
		if ( defined('WP_DEBUG') && true == WP_DEBUG )
			wp_register_script('jquery-fancybox', self::$plugin_url.'js/jquery.fancybox.js', array('jquery'), FANCYBOX_VERSION, true);
		else
			wp_register_script('jquery-fancybox', self::$plugin_url.'js/jquery.fancybox.min.js', array('jquery'), FANCYBOX_VERSION, true);
	}

	public static function enqueue_styles() {
		// register style
		// TODO allow for CDN https://cdnjs.com/libraries/fancybox/
		wp_dequeue_style('fancybox');
		if ( defined('WP_DEBUG') && true == WP_DEBUG )
			wp_enqueue_style('fancybox', self::$plugin_url.'css/jquery.fancybox.css', false, FANCYBOX_VERSION, 'screen');
		else
			wp_enqueue_style('fancybox', self::$plugin_url.'css/jquery.fancybox.min.css', false, FANCYBOX_VERSION, 'screen');
	}

	public static function enqueue_footer_scripts() {
		// FancyBox3
		wp_enqueue_script('jquery-fancybox');
	}

	public static function on_ready() {
		// 'gform_post_render' for gForms content triggers an error... Why?
		// 'post-load' is for Infinite Scroll by JetPack

		// first exclude some links by adding nolightbox class:
		// (1) nofancybox backwards compatibility and (2) tries to detect social sharing buttons with known issues
		echo '<script type="text/javascript">
jQuery(document).on(\'ready post-load\', function(){ jQuery(\'.nofancybox,a.pin-it-button,a[href*="pinterest.com/pin/create/button"]\').addClass(\'nolightbox\'); });';

		echo apply_filters( 'easy_fancybox_onready_handler', '
jQuery(document).on(\'ready post-load\',easy_fancybox_handler);' );

		echo apply_filters( 'easy_fancybox_onready_auto', '
jQuery(document).on(\'ready\',easy_fancybox_auto);' );

		echo '</script>
';
	}

	public static function init() {

	}

	public static function plugins_loaded(){
		if ( is_admin() ) {
			require_once dirname(__FILE__) . '/class-easyfancybox-admin.php';
			easyFancyBox_Admin::run();
		}
	}

	/**********************
	         RUN
	 **********************/

	public function __construct( $file ) {

		// VARS
		self::$plugin_url = plugins_url( '/', $file );
		self::$plugin_basename = plugin_basename( $file );

		// HOOKS //
		add_action('plugins_loaded', array(__CLASS__, 'plugins_loaded'));

		add_action('init', array(__CLASS__, 'init'));
		add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_styles'), 999);
		//add_action('wp_head', array(__CLASS__, 'main_script'), 999);
		add_action('wp_print_scripts', array(__CLASS__, 'register_scripts'), 999);
		add_action('wp_footer', array(__CLASS__, 'enqueue_footer_scripts'));
		add_action('wp_footer', array(__CLASS__, 'on_ready'), 999);
	}

}
