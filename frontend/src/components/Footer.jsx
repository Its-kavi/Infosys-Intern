import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                {/* Brand Section */}
                <div className={styles.brandSection}>
                    <Link to="/" className={styles.logo}>RideConnect</Link>
                    <p className={styles.tagline}>
                        Premium mobility platform connecting riders and hosts for seamless, eco-friendly travel.
                    </p>
                </div>

                {/* Company Links */}
                <div className={styles.column}>
                    <h3>Company</h3>
                    <ul className={styles.linkList}>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/careers">Careers</Link></li>
                        <li><Link to="/blog">Blog</Link></li>
                        <li><Link to="/press">Press</Link></li>
                    </ul>
                </div>

                {/* Support Links */}
                <div className={styles.column}>
                    <h3>Support</h3>
                    <ul className={styles.linkList}>
                        <li><Link to="/help">Help Center</Link></li>
                        <li><Link to="/safety">Safety</Link></li>
                        <li><Link to="/terms">Terms of Service</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                    </ul>
                </div>

                {/* Social Media */}
                <div className={styles.column}>
                    <h3>Follow Us</h3>
                    <div className={styles.socialIcons}>
                        <a href="https://facebook.com" target="_blank" rel="noreferrer" className={styles.iconBtn} aria-label="Facebook">
                            <Facebook size={20} />
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noreferrer" className={styles.iconBtn} aria-label="Instagram">
                            <Instagram size={20} />
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noreferrer" className={styles.iconBtn} aria-label="Twitter">
                            <Twitter size={20} />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={styles.iconBtn} aria-label="LinkedIn">
                            <Linkedin size={20} />
                        </a>
                    </div>
                </div>
            </div>

            <div className={styles.bottomBar}>
                <p className={styles.copyright}>© 2025 RideConnect. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
