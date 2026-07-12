<?php
if (!defined('ABSPATH')) {
    exit;
}

get_header();

$hero_title = rjasset_field('hero_title', 'RJ+ Asset');
$hero_subtitle = rjasset_field('hero_subtitle', 'Gestão de recursos com método e disciplina');
$hero_body = rjasset_field('hero_body', 'A RJ+ Asset é uma gestora de recursos independente, especializada em fundos estruturados e gestão de patrimônio. Nossa atuação combina profunda expertise em investimentos e crédito estruturado a processos rigorosos de análise, governança e controle de riscos, sempre com o compromisso de preservar e ampliar o patrimônio de nossos investidores no longo prazo.');
?>

<section class="rjasset-hero" aria-labelledby="hero-title">
    <div class="rjasset-container rjasset-hero__grid">
        <div class="rjasset-hero__content">
            <p class="rjasset-eyebrow">Gestora independente</p>
            <h1 id="hero-title"><?php echo esc_html($hero_title); ?></h1>
            <p class="rjasset-hero__subtitle"><?php echo esc_html($hero_subtitle); ?></p>
            <p class="rjasset-hero__body"><?php echo esc_html($hero_body); ?></p>
            <div class="rjasset-actions" aria-label="Ações principais">
                <a class="rjasset-button rjasset-button--primary" href="#contato">Falar com a RJ+ Asset</a>
                <a class="rjasset-button rjasset-button--secondary" href="#quem-somos">Conhecer a gestora</a>
            </div>
        </div>
        <div class="rjasset-hero__panel" aria-hidden="true">
            <span>Método</span>
            <span>Disciplina</span>
            <span>Governança</span>
        </div>
    </div>
</section>

<section id="quem-somos" class="rjasset-section rjasset-section--paper" aria-labelledby="quem-somos-title">
    <div class="rjasset-container">
        <div class="rjasset-section__header">
            <p class="rjasset-eyebrow">Quem Somos</p>
            <h2 id="quem-somos-title">Quem Somos</h2>
        </div>
        <div class="rjasset-card-grid">
            <article class="rjasset-card">
                <h3>Nossa essência</h3>
                <p>Somos uma gestora independente focada em oferecer as melhores soluções de investimentos para nossos clientes.</p>
            </article>
            <article class="rjasset-card">
                <h3>Nossos valores</h3>
                <p>Confiança, Respeito, Colaboração, Humildade e Integridade são a base dos nossos valores. Vivemos uma verdadeira Partnership.</p>
            </article>
            <article class="rjasset-card">
                <h3>Nossa estrutura</h3>
                <p>Contamos com comitês de Investimentos, Risco e Compliance, que asseguram processos decisórios estruturados e a aplicação consistente das melhores práticas desenvolvidas ao longo dos anos.</p>
            </article>
        </div>
    </div>
</section>

<section id="gestora-independente" class="rjasset-section" aria-labelledby="independente-title">
    <div class="rjasset-container rjasset-editorial">
        <div>
            <p class="rjasset-eyebrow">Atuação</p>
            <h2 id="independente-title">Uma gestora independente</h2>
        </div>
        <div class="rjasset-editorial__body">
            <p>
                <?php
                echo esc_html(rjasset_field(
                    'independent_body',
                    'Atendemos inúmeras pessoas, famílias e empresas, desenvolvendo Soluções Customizadas que tragam alinhamento de interesses para cada cliente. Como gestora independente, mantemos autonomia nas decisões de investimento e foco exclusivo nos interesses dos nossos investidores.'
                ));
                ?>
            </p>
            <?php echo wp_get_attachment_image(23, 'large', false, ['class' => 'rjasset-editorial__image', 'loading' => 'lazy']); ?>
        </div>
    </div>
</section>

<section id="contato" class="rjasset-section rjasset-section--dark" aria-labelledby="contato-title">
    <span id="vamos-conversar" class="rjasset-anchor" aria-hidden="true"></span>
    <div class="rjasset-container rjasset-contact">
        <div>
            <p class="rjasset-eyebrow">Vamos conversar</p>
            <h2 id="contato-title">Vamos conversar</h2>
            <h3>Quer entender se faz sentido para você?</h3>
            <p>Se você é investidor institucional, family office ou investidor qualificado, fale com a RJ+ Asset.</p>
            <p><strong>Informações de contato</strong><br><a href="mailto:atendimento@rjasset.com.br">atendimento@rjasset.com.br</a></p>
            <p class="rjasset-disclaimer">O envio deste contato não representa recomendação de investimento, abertura de conta ou contratação de produto financeiro. Evite informar dados sensíveis em campos abertos.</p>
        </div>
        <div class="rjasset-contact__box">
            <p class="rjasset-contact__label">Envie sua mensagem</p>
            <?php echo do_shortcode('[formlayer id="1"]'); ?>
        </div>
    </div>
</section>

<section id="politicas-da-gestora" class="rjasset-section rjasset-section--paper" aria-labelledby="politicas-title">
    <div class="rjasset-container">
        <div class="rjasset-section__header">
            <p class="rjasset-eyebrow">Documentos</p>
            <h2 id="politicas-title">Políticas da Gestora</h2>
        </div>
        <div class="rjasset-policy-grid">
            <?php foreach (rjasset_get_policies() as $policy) : ?>
                <?php get_template_part('template-parts/policy-card', null, ['policy' => $policy]); ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<?php
get_footer();
