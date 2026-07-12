<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<section class="rjasset-section rjasset-section--paper rjasset-page-hero">
    <div class="rjasset-container">
        <p class="rjasset-eyebrow">Documentos</p>
        <h1>Políticas da Gestora</h1>
        <p>Documentos institucionais e regulatórios da RJ+ Asset.</p>
    </div>
</section>
<section class="rjasset-section">
    <div class="rjasset-container">
        <div class="rjasset-policy-grid">
            <?php foreach (rjasset_get_policies() as $policy) : ?>
                <?php get_template_part('template-parts/policy-card', null, ['policy' => $policy]); ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php
get_footer();
