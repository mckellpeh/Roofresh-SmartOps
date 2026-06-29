'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <Link href="/" className={styles.navLink}>
          <Image 
            src="/icons/Logo.png" 
            alt="Roofresh Logo Icon" 
            width={80} 
            height={80} 
            className={styles.logoIcon}
            priority
          />
          <Image 
            src="/icons/Logo title.png" 
            alt="Roofresh Logo Title" 
            width={400} 
            height={100} 
            className={styles.logoTitle}
            priority
          />
        </Link>

        {/* Desktop horizontal navigation flanking the logo */}
        <div className={styles.leftNavContainer}>
          <Link href="/" className={styles.leftNavLink}>Dashboard</Link>
          <Link href="/monitoring" className={styles.leftNavLink}>Monitoring</Link>
          <Link href="/analytics" className={styles.leftNavLink}>Analytics</Link>
          <Link href="/weather" className={styles.leftNavLink}>Weather</Link>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <button className={styles.hamburgerBtn} onClick={() => setIsOpen(!isOpen)}>
          <span style={{ transform: isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
          <span style={{ opacity: isOpen ? 0 : 1 }}></span>
          <span style={{ transform: isOpen ? 'rotate(-45deg) translate(8px, -8px)' : 'none' }}></span>
        </button>

        {isOpen && (
          <div className={styles.menuDropdown} onClick={() => setIsOpen(false)}>
            <Link href="/" className={styles.menuLink}>Dashboard</Link>
            <Link href="/monitoring" className={styles.menuLink}>Monitoring</Link>
            <Link href="/analytics" className={styles.menuLink}>Analytics</Link>
            <Link href="/weather" className={styles.menuLink}>Weather</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
