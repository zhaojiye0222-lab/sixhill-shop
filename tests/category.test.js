const Database = require('../backend/database');

describe('Category and Flavor Structure Verification', () => {
  let categories;
  let products;

  beforeAll(() => {
    categories = Array.from(Database.categories.values());
    products = Array.from(Database.products.values());
  });

  test('Top level category should be Tobacco sticks', () => {
    const topLevel = categories.filter(c => c.parentId === null && c.id === 'cat_sticks');
    expect(topLevel.length).toBe(1);
    expect(topLevel[0].name).toBe('Tobacco sticks');
  });

  test('Tobacco sticks should only contain exactly two subcategories: kuaizhai sticks and Nise sticks', () => {
    const subCategories = categories.filter(c => c.parentId === 'cat_sticks');
    expect(subCategories.length).toBe(2);
    
    const subNames = subCategories.map(c => c.name);
    expect(subNames).toContain('kuaizhai sticks');
    expect(subNames).toContain('Nise sticks');
  });

  describe('kuaizhai sticks flavors', () => {
    let kzFlavors;
    
    beforeAll(() => {
      kzFlavors = products.filter(p => p.subCategoryId === 'cat_kuanzhai');
    });

    test('Should have exactly 10 flavors', () => {
      expect(kzFlavors.length).toBe(10);
    });

    test('First flavor must be Orange Red (陈皮)', () => {
      expect(kzFlavors[0].name).toBe('Orange Red (陈皮)');
    });

    test('The remaining 9 flavors must be in alphabetical order', () => {
      const remainingNames = kzFlavors.slice(1).map(f => f.name);
      const sortedRemainingNames = [...remainingNames].sort((a, b) => a.localeCompare(b));
      
      expect(remainingNames).toEqual(sortedRemainingNames);
    });
  });

  describe('Nise sticks flavors', () => {
    let niseFlavors;

    beforeAll(() => {
      niseFlavors = products.filter(p => p.subCategoryId === 'cat_nise');
    });

    test('Should include Coral Pink (草莓)', () => {
      const hasCoral = niseFlavors.some(f => f.name.includes('Coral Pink (草莓)'));
      expect(hasCoral).toBe(true);
    });

    test('All flavors should have Chinese translation in parentheses', () => {
      niseFlavors.forEach(flavor => {
        // Regex to check if the string contains Chinese characters inside parentheses
        const hasChineseInParentheses = /\([\u4e00-\u9fa5]+\)/.test(flavor.name);
        expect(hasChineseInParentheses).toBe(true);
      });
    });
  });
});
